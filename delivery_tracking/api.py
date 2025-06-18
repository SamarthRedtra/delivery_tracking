import frappe
from frappe import _
from frappe.utils import now_datetime, flt
import random
import time
import threading
import frappe

frappe.utils.logger.set_log_level("DEBUG")
logger = frappe.logger("api", allow_site=True, file_count=50)

@frappe.whitelist(allow_guest=True)
def register_rider(rider_id, rider_name):
    if frappe.db.exists("Rider Location", rider_id):
        frappe.throw(_("Rider ID already exists"))
        
    doc = frappe.get_doc({
        "doctype": "Rider Location",
        "rider_id": rider_id,
        "rider_name": rider_name
    })
    doc.insert()
    frappe.db.commit()
    return {"status": "success", "rider_id": rider_id}

@frappe.whitelist(allow_guest=True)
def update_location(rider_id, latitude, longitude, fetch_loc=False):
    
    if fetch_loc:
        rider_id = frappe.db.get_value("Rider Location", {"rider_id": rider_id}, "name")  
    
    if not frappe.db.exists("Rider Location", rider_id):
        frappe.throw(_("Rider ID does not exist"))
        
    frappe.db.set_value(
        "Rider Location",
        rider_id,
        {
            "latitude": float(latitude),
            "longitude": float(longitude),
        },
        update_modified=True
    )
    frappe.db.commit()
    frappe.publish_realtime(
        event="location_broadcast",
        message={
            "rider_id": rider_id,
            "rider_name": frappe.db.get_value("Rider Location", rider_id, "rider_name",cache=True),
            "last_updated": now_datetime(),
            "latitude": flt(latitude, precision=6),
            "longitude": flt(longitude, precision=6)
        },
        # room="rider_tracking"
    )
    print(f"Location updated for rider {rider_id}: ({latitude}, {longitude})")
    return {"status": "success"}


# @frappe.whitelist()
# def start_simulation(rider_id):
#     if not frappe.db.exists("Rider Location", rider_id):
#         frappe.throw(_("Rider ID does not exist"))

#     lat = frappe.db.get_value("Rider Location", rider_id, "latitude") or 0.0
#     lon = frappe.db.get_value("Rider Location", rider_id, "longitude") or 0.0    

#     def simulate_location():
#         print(f"Starting simulation for rider {rider_id}")
#         latitude = lat
#         longitude = lon
#         for _ in range(10):
#             latitude += random.uniform(-0.01, 0.01)
#             longitude += random.uniform(-0.01, 0.01)

#             update_location(rider_id, latitude, longitude)
#             time.sleep(1)

#     thread = threading.Thread(target=simulate_location, daemon=True)
#     thread.start()

#     return {"status": "success"}

@frappe.whitelist(allow_guest=True)
def simulate_location_background(rider_id, latitude, longitude):
    logger.info(f"🚀 Simulation started for rider {rider_id} at ({latitude}, {longitude})")
    for i in range(20):
        latitude += random.uniform(-0.01, 0.01)
        longitude += random.uniform(-0.01, 0.01)

        update_location(rider_id, latitude, longitude)
        time.sleep(1)
        logger.info(f"📍 Step {i+1} for {rider_id} - Location: ({latitude:.5f}, {longitude:.5f})")
    
    logger.info(f"✅ Simulation complete for rider {rider_id}")

@frappe.whitelist()
def start_simulation(rider_id):
    if not frappe.db.exists("Rider Location", rider_id):
        frappe.throw(_("Rider ID does not exist"))

    latitude = frappe.db.get_value("Rider Location", rider_id, "latitude") or 0.0
    longitude = frappe.db.get_value("Rider Location", rider_id, "longitude") or 0.0

    frappe.enqueue(
        "delivery_tracking.api.simulate_location_background",
        queue='default',
        timeout=300,
        rider_id=rider_id,
        latitude=latitude,
        longitude=longitude
    )

    return {"status": "success"}        