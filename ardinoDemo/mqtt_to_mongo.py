import json
from datetime import datetime, timezone
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
from pymongo import MongoClient

# ---------- MQTT ----------
MQTT_SERVER = "10.182.46.49"
MQTT_PORT = 1884
MQTT_TOPIC = "aquarium/telemetry"

MONGO_URI = "mongodb+srv://mykkularathne_db_user:SLpredetor%402026@agent-cluster.kdqnauq.mongodb.net/aquarium?retryWrites=true&w=majority"

DB_NAME = "aquarium"
COLLECTION = "telemetry"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION]

def on_connect(client, userdata, flags, rc, properties=None):
    print("Connected to MQTT:", rc)
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        payload["server_time"] = datetime.now(timezone.utc)

        result = collection.insert_one(payload)
        print("Inserted:", result.inserted_id)

    except Exception as e:
        print("Error:", e)

mqtt_client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2)
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

mqtt_client.connect(MQTT_SERVER, MQTT_PORT, 60)

print("Waiting for ESP32 data...")
mqtt_client.loop_forever()