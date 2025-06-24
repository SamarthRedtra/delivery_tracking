import frappe
from datetime import datetime

def execute():
    now = datetime.now()
    prefix = f"DL-R-{now.strftime('%m')}-{now.strftime('%y')}-"

    # Fetch current series value (if any)
    current = frappe.db.sql(
        "SELECT `current` FROM `tabSeries` WHERE `name` = %s",
        (prefix,),
        as_dict=1
    )

    if not current:
        # Insert series with current = 2
        frappe.db.sql(
            "INSERT INTO `tabSeries` (`name`, `current`) VALUES (%s, %s)",
            (prefix, 2)
        )
        print(f"Series '{prefix}' created with current = 2")
    elif current[0]["current"] < 2:
        # Update current to 2 if less than 2
        frappe.db.sql(
            "UPDATE `tabSeries` SET `current` = %s WHERE `name` = %s",
            (2, prefix)
        )
        print(f"Series '{prefix}' updated to current = 2")
    else:
        print(f"Series '{prefix}' already at {current[0]['current']}, no changes made")

    # Commit changes
    frappe.db.commit()