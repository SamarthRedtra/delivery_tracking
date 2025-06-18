# Copyright (c) 2025, samarth.upare@redtra.com and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import frappe.utils


class RiderLocation(Document):
	def on_update(self):
		frappe.publish_realtime(
			event="location_broadcast",
			message={
				"rider_id": self.rider_id,
				"rider_name": frappe.db.get_value("Rider Location", self.rider_id, "rider_name",cache=True),
				"last_updated": frappe.utils.now_datetime(),
				"latitude": float(self.latitude),
				"longitude": float(self.longitude)
			},
			# room="rider_tracking"
    	)
		print(f"Location updated for rider {self.rider_id}: ({self.latitude}, {self.longitude})")
