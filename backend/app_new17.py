import argparse
import time
from functools import lru_cache
import threading
import json
from queue import Queue
import os
from dotenv import load_dotenv
import razorpay
from pymongo import MongoClient
import cv2
from picamera2 import MappedArray, Picamera2
from picamera2.devices.imx500 import IMX500
from flask import Flask, Response, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

load_dotenv()

# Global variables with locks for thread safety
latest_detections = []
detections_lock = threading.Lock()
frame_queue = Queue(maxsize=10)  # Buffer for streaming frames
PRODUCTS = None

# Global variables for detection control and ingredient aggregation
detection_active = False
detected_ingredients = {}

# MongoDB setup
try:
    mongo_uri = os.getenv('MONGODB_URI')
    print(f"Attempting to connect to MongoDB with URI: {mongo_uri}")
    client = MongoClient(mongo_uri)
    db = client.smart_checkout
    invoices_collection = db.invoices
    # Test the connection
    client.admin.command('ping')
    print("MongoDB Atlas connected successfully")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# Razorpay setup
razorpay_client = razorpay.Client(
    auth=(os.getenv('RAZORPAY_KEY_ID'), os.getenv('RAZORPAY_KEY_SECRET'))
)

# Initialize Flask app and SocketIO
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")


class Detection:
    def __init__(self, coords, category, conf, metadata):
        """Create a Detection object with bounding box, category, and confidence."""
        self.category = category
        self.conf = conf
        try:
            self.box = imx500.convert_inference_coords(coords, metadata, picam2)
            # Ensure box coordinates are valid integers and within frame bounds (640x480)
            self.box = [int(max(0, min(val, 640 if i % 2 == 0 else 480))) for i, val in enumerate(self.box)]
        except Exception as e:
            print(f"Error converting coordinates: {e}")
            # Fallback to scaling raw coordinates assuming normalized [0,1]
            self.box = [int(val * (640 if i % 2 == 0 else 480)) for i, val in enumerate(coords)]


def pre_callback(request):
    """Process detections, draw bounding boxes on the main frame, and queue the frame for streaming."""
    metadata = request.get_metadata()
    np_outputs = imx500.get_outputs(metadata, add_batch=True)
    detections = []
    if np_outputs is not None:
        boxes, scores, classes = np_outputs[0][0], np_outputs[2][0], np_outputs[1][0]
        filtered_detections = [
            (box, score, category)
            for box, score, category in zip(boxes, scores, classes)
            if score >= args.threshold
        ]
        print(f"Found {len(filtered_detections)} detections above threshold")
        for box, score, category in filtered_detections:
            try:
                det = Detection(box, category, score, metadata)
                detections.append(det)
                print(f"Added detection for category {category} with confidence {score:.2f}")
            except Exception as e:
                print(f"Error creating detection: {e}")
    
    # Update global detections for WebSocket (regardless of detection mode)
    with detections_lock:
        global latest_detections
        latest_detections = detections
    
    # Draw detections on the main stream
    with MappedArray(request, "main") as m:
        labels = get_labels()
        for detection in detections:
            x, y, w, h = detection.box
            label = f"{labels[int(detection.category)]} ({detection.conf:.2f})"
            cv2.putText(
                m.array,
                label,
                (x + 5, y + 15),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                2,
            )
            cv2.rectangle(m.array, (x, y), (x + w, y + h), (0, 255, 0), 2)
        if not frame_queue.full():
            frame_queue.put(m.array.copy())


@lru_cache
def get_labels():
    """Load and cache labels from the labels file."""
    try:
        with open(args.labels, 'r') as f:
            labels = [line.strip() for line in f.readlines()]
        print(f"Loaded {len(labels)} labels from {args.labels}")
        return labels
    except Exception as e:
        print(f"Error loading labels: {e}")
        return []


def generate_frames():
    """Generate MJPEG frames for video streaming from the queue."""
    while True:
        if not frame_queue.empty():
            frame = frame_queue.get()
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            ret, buffer = cv2.imencode('.jpg', rgb_frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        else:
            time.sleep(0.01)


@app.route('/video_feed')
def video_feed():
    """Serve the MJPEG video stream."""
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/')
def index():
    """Serve the HTML page for the website with video feed and dashboard."""
    return '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Smart Checkout - Cooking Mode</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
            body { font-family: Arial, sans-serif; }
            #container {
                display: flex;
                flex-direction: row;
                justify-content: space-around;
            }
            #left-pane, #right-pane {
                flex: 1;
                padding: 20px;
            }
            #video-feed { width: 640px; height: 480px; }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: left;
            }
            button {
                padding: 10px 20px;
                margin: 10px;
                font-size: 16px;
                cursor: pointer;
            }
            #checkout-btn {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 12px 24px;
                font-size: 18px;
                margin-top: 20px;
            }
            #checkout-btn:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }
            .total-amount {
                font-size: 20px;
                font-weight: bold;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <h1>Smart Checkout - Cooking Mode</h1>
        <div id="container">
            <div id="left-pane">
                <h2>Camera Feed</h2>
                <img id="video-feed" src="/video_feed" alt="Camera Feed">
                <div>
                    <button id="start-btn">Start Detection</button>
                    <button id="stop-btn">Stop Detection</button>
                </div>
            </div>
            <div id="right-pane">
                <h2>Dashboard</h2>
                <table id="dashboard-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Rows will be updated in real time -->
                    </tbody>
                </table>
                <div class="total-amount">Total Amount: ₹<span id="total-amount">0</span></div>
                <button id="checkout-btn" disabled>Proceed to Checkout</button>
            </div>
        </div>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
            const socket = io();
            const startBtn = document.getElementById('start-btn');
            const stopBtn = document.getElementById('stop-btn');
            const tableBody = document.getElementById('dashboard-table').getElementsByTagName('tbody')[0];
            const checkoutBtn = document.getElementById('checkout-btn');
            const totalAmountSpan = document.getElementById('total-amount');
            let cartItems = [];
            let totalAmount = 0;

            startBtn.addEventListener('click', function() {
                socket.emit('start_detection');
            });

            stopBtn.addEventListener('click', function() {
                socket.emit('stop_detection');
            });

            socket.on('detection_update', function(data) {
                tableBody.innerHTML = '';
                cartItems = [];
                totalAmount = 0;

                data.forEach(item => {
                    const row = document.createElement('tr');
                    const total = item.quantity * item.price;
                    totalAmount += total;
                    
                    row.innerHTML = `
                        <td>${item.label}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price}</td>
                        <td>₹${total}</td>
                    `;
                    tableBody.appendChild(row);
                    
                    cartItems.push({
                        name: item.label,
                        quantity: item.quantity,
                        price: item.price,
                        total: total
                    });
                });

                totalAmountSpan.textContent = totalAmount;
                checkoutBtn.disabled = totalAmount === 0;
            });

            checkoutBtn.addEventListener('click', async function() {
                try {
                    const response = await fetch('http://localhost:5001/api/create-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            amount: totalAmount,
                            items: cartItems
                        })
                    });

                    const data = await response.json();
                    
                    const options = {
                        key: data.key,
                        amount: data.amount * 100,
                        currency: data.currency,
                        name: "Smart Checkout",
                        description: "Payment for your items",
                        order_id: data.orderId,
                        handler: async function (response) {
                            try {
                                const verifyResponse = await fetch('http://localhost:5001/api/verify-payment', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_signature: response.razorpay_signature
                                    })
                                });

                                const verifyData = await verifyResponse.json();
                                if (verifyData.status === 'success') {
                                    alert('Payment successful! Your order has been placed.');
                                    // Clear the cart
                                    tableBody.innerHTML = '';
                                    totalAmount = 0;
                                    totalAmountSpan.textContent = '0';
                                    checkoutBtn.disabled = true;
                                    cartItems = [];
                                }
                            } catch (error) {
                                console.error('Payment verification failed:', error);
                                alert('Payment verification failed. Please contact support.');
                            }
                        },
                        prefill: {  
                            name: "",
                            email: "",
                            contact: ""
                        },
                        theme: {
                            color: "#4CAF50"
                        }
                    };

                    const rzp = new Razorpay(options);
                    rzp.open();
                } catch (error) {
                    console.error('Failed to create order:', error);
                    alert('Failed to initiate payment. Please try again.');
                }
            });
        </script>
    </body>
    </html>
    '''


@socketio.on('start_detection')
def handle_start_detection():
    global detection_active, detected_ingredients
    detection_active = True
    detected_ingredients = {}  # Reset accumulated data for new detection
    print("Detection started.")


@socketio.on('stop_detection')
def handle_stop_detection():
    global detection_active
    detection_active = False
    print("Detection stopped.")


def emit_detections():
    """Send detection updates via WebSocket, processing new detections and updating the dashboard."""
    global detection_active, latest_detections
    detected_products = []
    last_detected_product = None
    last_detection_time = 0
    min_detection_gap = 2  # Time gap between detections
    
    while True:
        if detection_active:
            with detections_lock:
                current_detections = latest_detections.copy()
            
            current_time = time.time()
            
            if len(current_detections) == 1:
                detection = current_detections[0]
                labels = get_labels()
                product_name = labels[int(detection.category)]
                
                # Check if enough time has passed since last detection
                if current_time - last_detection_time >= min_detection_gap:
                    # Find existing product
                    existing_product = next(
                        (p for p in detected_products if p['name'] == product_name), 
                        None
                    )
                    
                    if existing_product:
                        # Increment quantity of existing product
                        existing_product['quantity'] += 1
                    else:
                        # Add new product
                        detected_products.append({
                            'name': product_name,
                            'quantity': 1,
                            'price': 10 # Add actual price logic here
                        })
                    
                    # Update tracking variables
                    last_detected_product = product_name
                    last_detection_time = current_time
                    
                    # Update dashboard
                    socketio.emit('detection_update', {
                        'products': detected_products
                    })
                
        time.sleep(0.1)  # Small delay to prevent excessive updates


def add_test_detections():
    """Add fake detections for testing visualization.
    
    Cycles through different product categories to simulate scanning multiple products.
    """
    category = 0  # Start with first product
    max_category = len(get_labels()) - 1  # Get number of available products
    
    while True:
        with detections_lock:
            global latest_detections
            # Create a test detection with current category
            test_detection = Detection([100, 100, 200, 150], category, 0.95, {"ScalerCrop": (480, 640)})
            latest_detections = [test_detection]
            label = get_labels()[category]
            print(f"Added test detection for {label}")
            
            # Move to next category, loop back to 0 if at end
            category = (category + 1) % (max_category + 1)
            
        time.sleep(2)


def get_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, required=True, help="Path to the model")
    parser.add_argument("--fps", type=int, default=15, help="Frames per second")
    parser.add_argument("--threshold", type=float, default=0.2, help="Detection threshold")
    parser.add_argument("--labels", type=str, default="assets/labels.txt", help="Path to labels file")
    parser.add_argument("--products", type=str, default="products.json", help="Path to product details JSON")
    parser.add_argument("--test-mode", action="store_true", help="Run with test detections")
    return parser.parse_args()


@app.route('/create-order', methods=['POST'])
def create_order():
    try:
        data = request.json
        amount = int(float(data['amount']) * 100)  # Convert to paise
        currency = "INR"
        
        # Create Razorpay Order
        payment_order = razorpay_client.order.create(dict(
            amount=amount,
            currency=currency,
            payment_capture='1'
        ))
        
        return jsonify({
            'id': payment_order['id'],
            'amount': amount,
            'currency': currency,
            'key': os.getenv('RAZORPAY_KEY_ID')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/payment-success', methods=['POST'])
def payment_success():
    try:
        data = request.json
        print("Received payment success data:", data)
        
        # Verify payment signature
        params_dict = {
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_order_id': data['razorpay_order_id'],
            'razorpay_signature': data['razorpay_signature']
        }
        
        razorpay_client.utility.verify_payment_signature(params_dict)
        print("Payment signature verified")
        
        # Store invoice in MongoDB with additional details
        invoice_data = {
            'order_id': data['razorpay_order_id'],
            'payment_id': data['razorpay_payment_id'],
            'amount': data['amount'],
            'products': data['products'],
            'timestamp': time.time(),
            'date': time.strftime('%Y-%m-%d'),
            'time': time.strftime('%H:%M:%S'),
            'status': 'paid',
            'payment_method': 'razorpay',
            'currency': 'INR',
            'total_items': len(data['products']),
            'total_amount': float(data['amount']),
            'payment_status': 'success',
            'transaction_id': data['razorpay_payment_id']
        }
        
        print("Saving invoice data:", invoice_data)
        
        # Insert into MongoDB
        result = invoices_collection.insert_one(invoice_data)
        print(f"Invoice saved with ID: {result.inserted_id}")
        
        if result.inserted_id:
            return jsonify({
                'status': 'success',
                'message': 'Payment successful and invoice stored',
                'invoice_id': str(result.inserted_id)
            })
        else:
            raise Exception("Failed to store invoice in database")
            
    except Exception as e:
        print(f"Error in payment success: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/transactions', methods=['GET'])
def get_transactions():
    try:
        # Print debug information
        print("Fetching transactions from MongoDB...")
        print(f"MongoDB URI: {os.getenv('MONGODB_URI')}")
        print(f"Database: {db.name}")
        print(f"Collection: {invoices_collection.name}")
        
        # Fetch all transactions and print count
        transactions = list(invoices_collection.find({}, {'_id': 0}).sort('timestamp', -1))
        print(f"Found {len(transactions)} transactions")
        
        # Print first transaction if exists
        if transactions:
            print("Latest transaction:", transactions[0])
        
        return jsonify({
            'status': 'success',
            'transactions': transactions
        })
    except Exception as e:
        print(f"Error fetching transactions: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == "__main__":
    args = get_args()

    # Initialize IMX500 and Picamera2
    imx500 = IMX500(args.model)
    imx500.show_network_fw_progress_bar()
    picam2 = Picamera2()
    config = picam2.create_video_configuration(
        main={"size": (640, 480)},
        lores={"size": (640, 480)},
        controls={"FrameRate": args.fps}
    )
    picam2.pre_callback = pre_callback

    # Load product details (ensure products.json is updated accordingly)
    with open(args.products, 'r') as f:
        PRODUCTS = json.load(f)

    # Start the camera
    picam2.start(config, show_preview=True)

    # Start test detections if enabled
    if args.test_mode:
        threading.Thread(target=add_test_detections, daemon=True).start()
        print("Running in test mode with fake detections")

    # Start WebSocket emitter for updating dashboard
    threading.Thread(target=emit_detections, daemon=True).start()

    # Run Flask app with Socket.IO
    socketio.run(app, host='0.0.0.0', port=5000)
