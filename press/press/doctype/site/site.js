// Copyright (c) 2019, Frappe and contributors
// For license information, please see license.txt

frappe.ui.form.on('Site', {
	onload: function (frm) {
		frm.set_query('bench', function () {
			return {
				filters: {
					server: frm.doc.server,
					status: 'Active',
				},
			};
		});
		frm.set_query('host_name', () => {
			return {
				filters: {
					site: frm.doc.name,
					status: 'Active',
				},
			};
		});
	},
	refresh: async function (frm) {
		frm.dashboard.set_headline_alert(
			`<div class="container-fluid">
				<div class="row">
					<div class="col-sm-4">CPU Usage: ${frm.doc.current_cpu_usage}%</div>
					<div class="col-sm-4">Database Usage: ${frm.doc.current_database_usage}%</div>
					<div class="col-sm-4">Disk Usage: ${frm.doc.current_disk_usage}%</div>
				</div>
			</div>`,
		);
		frm.add_web_link(`https://${frm.doc.name}/apps`, __('Visit Site'));
		frm.add_web_link(`/dashboard/sites/${frm.doc.name}`, __('Visit Dashboard'));

		let site = frm.get_doc();
		let account = await frappe
			.call({
				method: 'press.api.account.get',
			})
			.then((resp) => resp.message);

		if (site.status == 'Active') {
			frm.add_custom_button(
				__('Login as Adminstrator'),
				() => {
					if (account) {
						if (site.team === account.team.name) {
							login_as_admin(site.name);
						} else {
							new frappe.ui.Dialog({
								title: 'Login as Adminstrator',
								fields: [
									{
										label: 'Please enter reason for this login.',
										fieldname: 'reason',
										fieldtype: 'Small Text',
									},
								],
								primary_action_label: 'Login',
								primary_action(values) {
									if (values) {
										let reason = values.reason;
										console.log(reason);
										login_as_admin(site.name, reason);
									} else {
										frappe.throw(__('Reason field should not be empty'));
									}
									this.hide();
								},
							}).show();
						}
					} else {
						frappe.throw(
							__(
								"Couldn't retrieve account. Check Error Log for more information",
							),
						);
					}
				},
				__('Actions'),
			);
		}

		[
			[__('Backup'), 'backup'],
			[__('Physical Backup'), 'physical_backup'],
			[__('Sync Info'), 'sync_info'],
		].forEach(([label, method]) => {
			frm.add_custom_button(
				label,
				() => {
					frm.call(method).then((r) => frm.refresh());
				},
				__('Actions'),
			);
		});
		[
			[__('Archive'), 'archive', frm.doc.status !== 'Archived'],
			[__('Cleanup after Archive'), 'cleanup_after_archive'],
			[__('Sync Apps'), 'sync_apps'],
			[__('Migrate'), 'migrate'],
			[__('Reinstall'), 'reinstall'],
			[__('Restore'), 'restore_site'],
			[__('Restore Tables'), 'restore_tables'],
			[__('Update'), 'schedule_update'],
			[__('Deactivate'), 'deactivate'],
			[__('Activate'), 'activate', frm.doc.status !== 'Archived'],
			[__('Reset Site Usage'), 'reset_site_usage'],
			[__('Clear Cache'), 'clear_site_cache'],
			[__('Optimize Tables'), 'optimize_tables'],
			[__('Update Site Config'), 'update_site_config'],
			[__('Create DNS Record'), 'create_dns_record'],
			[__('Run After Migrate Steps'), 'run_after_migrate_steps'],
			[__('Retry Rename'), 'retry_rename'],
			[
				__('Retry Archive'),
				'retry_archive',
				frm.doc.name.includes('.archived'),
			],
			[__('Update without Backup'), 'update_without_backup'],
			[
				__('Fetch bench from Agent'),
				'fetch_bench_from_agent',
				frm.doc.status !== 'Archived',
			],
			[
				__('Set status based on Ping'),
				'set_status_based_on_ping',
				!['Active', 'Archived', 'Inactive', 'Suspended'].includes(
					frm.doc.status,
				),
			],
			[__('Show Admin Password'), 'show_admin_password'],
		].forEach(([label, method, condition]) => {
			if (typeof condition === 'undefined' || condition) {
				frm.add_custom_button(
					label,
					() => {
						frappe.confirm(
							`Are you sure you want to ${label.toLowerCase()} this site?`,
							() => frm.call(method).then((r) => frm.refresh()),
						);
					},
					__('Actions'),
				);
			}
		});

		frm.add_custom_button(
			__('Update Skip Failing Patches'),
			() => {
				frm.call('schedule_update', { skip_failing_patches: true });
			},
			__('Actions'),
		);

		frm.add_custom_button(
			__('Force Archive'),
			() => {
				frappe.confirm(`Are you sure you want to force drop this site?`, () =>
					frm.call('archive', { force: true }).then((r) => frm.refresh()),
				);
			},
			__('Actions'),
		);

		[
			[__('Suspend'), 'suspend'],
			[__('Unsuspend'), 'unsuspend'],
		].forEach(([label, method]) => {
			frm.add_custom_button(
				label,
				() => {
					frappe.prompt(
						{
							fieldtype: 'Data',
							label: 'Reason',
							fieldname: 'reason',
							reqd: 1,
						},
						({ reason }) => {
							frm
								.call(method, {
									reason,
								})
								.then((r) => frm.refresh());
						},
						__('Provide Reason'),
					);
				},
				__('Actions'),
			);
		});
		frm.toggle_enable(['host_name'], frm.doc.status === 'Active');

		frm.add_custom_button(
			__('Replicate Site'),
			() => {
				const dialog = new frappe.ui.Dialog({
					title: __('New Subdomain for Test Site'),
					fields: [
						{
							fieldtype: 'Data',
							fieldname: 'subdomain',
							label: 'New Subdomain',
							reqd: 1,
						},
					],
					primary_action({ subdomain }) {
						frappe.set_route('List', 'Site Replication', {
							site: frm.doc.name,
						});
						frappe.new_doc('Site Replication', {
							site: frm.doc.name,
							subdomain: subdomain,
						});
					},
				});
				dialog.show();
			},
			__('Actions'),
		);

		frm.add_custom_button(
			__('Update DNS Record'),
			() => {
				const dialog = new frappe.ui.Dialog({
					title: __('Update DNS Record'),
					fields: [
						{
							fieldtype: 'Data',
							fieldname: 'value',
							label: 'Value',
							description: "Site's CNAME record will point to this value",
							reqd: 1,
						},
					],
					primary_action(args) {
						frm
							.call('update_dns_record', {
								value: args.value,
							})
							.then(() => {
								dialog.hide();
							});
					},
				});
				dialog.show();
			},
			__('Dangerous Actions'),
		);

		frm.add_custom_button(
			__('Move to Group'),
			() => {
				const dialog = new frappe.ui.Dialog({
					title: __('Move to Group'),
					fields: [
						{
							fieldtype: 'Link',
							options: 'Release Group',
							label: __('Destination Group'),
							fieldname: 'group',
							get_query: () => {
								return {
									filters: [
										['server', '=', frm.doc.server],
										['name', '!=', frm.doc.group],
									],
								};
							},
						},
						{
							fieldtype: 'Check',
							label: __('Skip Failing Patches'),
							fieldname: 'skip_failing_patches',
						},
					],
				});

				dialog.set_primary_action(__('Move Site'), (args) => {
					frm
						.call('move_to_group', {
							group: args.group,
							skip_failing_patches: args.skip_failing_patches,
						})
						.then((r) => {
							dialog.hide();
							frm.refresh();
						});
				});

				dialog.show();
			},
			__('Actions'),
		);

		frm.add_custom_button(
			__('Forcefully Remove Site'),
			() => {
				const dialog = new frappe.ui.Dialog({
					title: __('Forcefully Remove Site'),
					fields: [
						{
							fieldtype: 'Link',
							options: 'Bench',
							label: __('Bench'),
							fieldname: 'bench',
							reqd: 1,
							get_query: () => {
								return {
									filters: [
										['name', '!=', frm.doc.bench],
										['status', '!=', 'Archived'],
									],
								};
							},
						},
						{
							fieldtype: 'Check',
							label: __("I know what I'm doing"),
							fieldname: 'confirmation',
							reqd: 1,
						},
					],
				});

				dialog.set_primary_action(__('Forcefully Remove Site'), (args) => {
					if (!args.confirmation) {
						frappe.throw(__("Please confirm that you know what you're doing"));
					}
					frm
						.call('forcefully_remove_site', {
							bench: args.bench,
						})
						.then((r) => {
							dialog.hide();
							frm.refresh();
							if (r.message.job) {
								message = `
Removing site from **${r.message.bench}**.

Track progress [here](https://${r.message.server}/agent/jobs/${r.message.job}).`;
								frappe.msgprint(frappe.markdown(message), 'Removing Site');
							} else {
								message = `
Couldn't remove site from **${r.message.bench}**.
\`\`\`
${r.message.error}
\`\`\``;
								frappe.msgprint(
									frappe.markdown(message),
									'Failed to Remove Site',
								);
							}
						});
				});

				dialog.show();
			},
			__('Dangerous Actions'),
		);

		frm.add_custom_button(
			__('Forcefully Move Site'),
			() => {
				const dialog = new frappe.ui.Dialog({
					title: __('Forcefully Move Site'),
					fields: [
						{
							fieldtype: 'Link',
							options: 'Bench',
							label: __('Bench'),
							fieldname: 'bench',
							reqd: 1,
							get_query: () => {
								return {
									filters: [
										['name', '!=', frm.doc.bench],
										['status', '!=', 'Archived'],
									],
								};
							},
						},
						{
							fieldtype: 'Check',
							label: __("I know what I'm doing"),
							fieldname: 'confirmation',
							reqd: 1,
						},
						{
							fieldtype: 'Check',
							label: __('Deactivate'),
							fieldname: 'deactivate',
						},
					],
				});

				dialog.set_primary_action(__('Forcefully Move Site'), (args) => {
					if (!args.confirmation) {
						frappe.throw(__("Please confirm that you know what you're doing"));
					}
					frm
						.call('move_to_bench', {
							bench: args.bench,
							deactivate: args.deactivate,
						})
						.then(() => {
							dialog.hide();
							frm.refresh();
						});
				});

				dialog.show();
			},
			__('Dangerous Actions'),
		);
	},
});

function login_as_admin(site_name, reason = null) {
	frappe
		.call({
			method: 'press.api.site.login',
			args: {
				name: site_name,
				reason: reason,
			},
		})
		.then(
			(res) => {
				console.log(site_name, res.message.sid);
				if (res) {
					window.open(
						`https://${site_name}/desk?sid=${res.message.sid}`,
						'_blank',
					);
				}
			},
			(error) => {
				console.log(error);
				frappe.throw(__(`An error occurred!!`));
			},
		);
}
