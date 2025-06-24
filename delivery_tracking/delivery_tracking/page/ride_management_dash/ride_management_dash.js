frappe.pages['ride-management-dash'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Ride Management Dashboard',
        single_column: true
    });

    // Load Leaflet
    frappe.require([
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    ], function() {
        // Initialize the dashboard
        let $container = $(`
            <div style="margin-bottom: 10px;">
                <button id="update-driver-location" class="btn btn-primary">Update Driver Location</button>
                <button id="start-simulation" class="btn btn-success" style="margin-left: 10px;">Start Simulation</button>
            </div>
            <div id="map" style="height: 600px;"></div>
            <div id="rider-list" style="margin-top: 20px;"></div>
        `).appendTo(page.body);

        const bikeIcon = L.icon({
            iconUrl: '/assets/delivery_tracking/delivery-man.png',  
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        let map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        let markers = {};

		frappe.realtime.on("location_broadcast", (data) => {
            let { rider_id, latitude, longitude , rider_name} = data;
            if (markers[rider_id]) {
                map.removeLayer(markers[rider_id]);
            }

            markers[rider_id] = L.marker([latitude, longitude], { icon: bikeIcon }).addTo(map)
                .bindPopup(getPopupContent(rider_id, rider_name, latitude, longitude), { autoClose: false })
                .on('mouseover', function() { this.openPopup(); })
                .on('mouseout', function() { this.closePopup(); });

            update_rider_list();
        });

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Rider Location',
                fields: ['rider_id', 'rider_name', 'latitude', 'longitude'],
                filters: { latitude: ['is', 'set'], longitude: ['is', 'set'] }
            },
            callback: function(r) {
                if (r.message) {
                    r.message.forEach(rider => {
						console.log(rider);
                        markers[rider.rider_id] = L.marker([rider.latitude, rider.longitude], { icon: bikeIcon }).addTo(map)
                            .bindPopup(getPopupContent(rider.rider_id, rider.rider_name, rider.latitude, rider.longitude), { autoClose: false })
                            .on('mouseover', function() { this.openPopup(); })
                            .on('mouseout', function() { this.closePopup(); });
                    });
                    update_rider_list();
                    if (r.message.length > 0) {
                        map.setView([r.message[0].latitude, r.message[0].longitude], 10);
                    }
                }
            }
        });

        function getPopupContent(rider_id, rider_name, latitude, longitude) {
            return `
                <b>Rider Name:</b> ${rider_name || 'Unknown'}<br>
                <b>Rider ID:</b> ${rider_id}<br>
                <b>Coordinates:</b> (${latitude.toFixed(4)}, ${longitude.toFixed(4)})
            `;
        }

        function update_rider_list() {
            let list_html = '<h3>Active Riders</h3><ul>';
            Object.keys(markers).forEach(rider_id => {
                let rider = frappe.get_doc('Rider Location', rider_id);
                if (rider) {
                    list_html += `<li>${rider.rider_name} (${rider_id}) - Lat: ${markers[rider_id].getLatLng().lat.toFixed(4)}, Lng: ${markers[rider_id].getLatLng().lng.toFixed(4)}</li>`;
                }
            });
            list_html += '</ul>';
            $('#rider-list').html(list_html);
        }

        // Handle Update Driver Location button click
        $('#update-driver-location').on('click', function() {
            let d = new frappe.ui.Dialog({
                title: 'Update Driver Location',
                fields: [
                    {
                        label: 'Rider ID',
                        fieldname: 'rider_id',
                        fieldtype: 'Link',
                        options: 'Rider',
                        reqd: 1
                    },
                    {
                        label: 'Latitude',
                        fieldname: 'latitude',
                        fieldtype: 'Float',
						precision: 6,
                        reqd: 1
                    },
                    {
                        label: 'Longitude',
                        fieldname: 'longitude',
                        fieldtype: 'Float',
						precision: 6,
                        reqd: 1
                    }
                ],
                primary_action_label: 'Update',
                primary_action(values) {
                    frappe.call({
                        method: 'delivery_tracking.api.update_location',
                        args: {
                            rider_id: values.rider_id,
                            latitude: values.latitude,
                            longitude: values.longitude,
							fetch_loc: true
                        },
                        callback: function(r) {
                            if (r.message && r.message.status === 'success') {
                                frappe.msgprint('Location updated successfully');
                                d.hide();
                            }
                        },
                        error: function(err) {
                            frappe.msgprint('Error updating location: ' + err.message);
                        }
                    });
                }
            });
            d.show();
        });

        // Handle Start Simulation button click
        $('#start-simulation').on('click', function() {
            let d = new frappe.ui.Dialog({
                title: 'Start Driver Location Simulation',
                fields: [
                    {
                        label: 'Rider ID',
                        fieldname: 'rider_id',
                        fieldtype: 'Link',
                        options: 'Rider Location',
                        reqd: 1
                    }
                ],
                primary_action_label: 'Start',
                primary_action(values) {
                    frappe.call({
                        method: 'delivery_tracking.api.start_simulation',
                        args: {
                            rider_id: values.rider_id
                        },
                        callback: function(r) {
                            if (r.message && r.message.status === 'success') {
                                frappe.msgprint('Simulation started for rider ' + values.rider_id);
                                d.hide();
                            }
                        },
                        error: function(err) {
                            frappe.msgprint('Error starting simulation: ' + err.message);
                        }
                    });
                }
            });
            d.show();
        });
    });
};