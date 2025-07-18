# Copyright (c) 2025, Frappe and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class User2FARecoveryCode(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		code: DF.Password
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		used_at: DF.Datetime | None
	# end: auto-generated types

	pass
