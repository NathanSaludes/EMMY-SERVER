const moment = require('moment');

// IMPORT MODELS
const { Employee } = require('../db/models/Employee.js');
const { EmployeeLog } = require('../db/models/EmployeeLog.js');
const { isOverdue } = require('./OverdueEmployeeLog.js');



exports.handleEmployeeLog = (io, fingerprintId) => {

	return new Promise(async (resolve, reject) => {
		try {

			// find employee
			let employee = await Employee.findOne({ fingerprintId });

			// EMPLOYEE DOES NOT EXIST -----------------------------------------------------------------------------------
			if (!employee) {

				io.sockets.emit('logError', {
					message: `You are not currently registered in the system.`
				})

				reject({
					status: 404,
					message: `Empoyee not registered!`
				});
			}

			// LATEST LOG NOT INITIALIZED (Recently registered employee) -------------------------------------------------
			if (!employee.latestLog) {

				let clockIn = new EmployeeLog({
					employeeRef: employee._id
				});

				clockIn.save();

				employee.latestLog = {
					reference: clockIn._id,
					date: clockIn.in
				}

				employee.save();

				io.sockets.emit('employeeLog', {
					reference: clockIn._id,
					employee: `${employee.firstName} ${employee.lastName}`,
					status: "in",
				})

				resolve({
					status: 200,
					message: `Recently registered employee! Recorded new log. (${moment().format('lll')})`
				});
			}

			// get the last recorded log of the employee
			let lastLog = await EmployeeLog.findById(employee.latestLog.reference);

			// EMPLOYEE LOG NOT FOUND -----------------------------------------------------------------------------------
			if (!lastLog) {

				let clockIn = new EmployeeLog({
					employeeRef: employee._id
				});

				clockIn.save();

				employee.latestLog = {
					reference: clockIn._id,
					date: clockIn.in
				}

				employee.save();

				io.sockets.emit("employeeLog", {
					reference: clockIn._id,
					employee: `${employee.firstName} ${employee.lastName}`,
					status: "in",
				})

				resolve({
					status: 404,
					message: `Employee log LOST. ${employee.firstName} ${employee.lastName} clocked-in. (${moment().format('lll')})`
				});
			}

			// PEFORM VALIDATIONS --------------------------------------------------------------------------------------
			let timeIn = lastLog.in;
			let timeOut = lastLog.out;

			// no time-out
			if (!timeOut) {

				let overdue = isOverdue(timeIn);

				if (overdue) {

					let clockIn = new EmployeeLog({
						employeeRef: employee._id
					});

					clockIn.save();

					employee.latestLog = {
						reference: clockIn._id,
						date: clockIn.dateCreated
					}

					employee.save();

					io.sockets.emit('employeeLog', {
						reference: lastLog._id,
						employee: `${employee.firstName} ${employee.lastName}`,
						status: "in",
					});

					resolve({
						status: 200,
						message: `
							${employee.firstName} ${employee.lastName} did not clock-out yesterday (${moment().format('LL')}).
							New log recorded! [${clockIn.in}]
						`
					});

				} else {

					lastLog.out = new Date();
					lastLog.save();

					io.sockets.emit('employeeLog', {
						reference: lastLog._id,
						employee: `${employee.firstName} ${employee.lastName}`,
						status: "out",
					})

					resolve({
						status: 200,
						message: `${employee.firstName} ${employee.lastName} successfully clocked-out! (${moment().format('lll')})`
					})
				}

			} else {

				let now = new Date();

				if (moment(now).isSame(timeOut, 'day')) {

					io.sockets.emit('logError', {
						message: `Sorry! you have already checked-out for the day. Please try again tomorrow.`,
					})

					reject({
						status: 400,
						message: `Sorry! you have already checked-out for the day. Please try again tomorrow.`
					});

				} else {

					let clockIn = new EmployeeLog({
						employeeRef: employee._id
					});

					clockIn.save();

					employee.latestLog = {
						reference: clockIn._id,
						date: clockIn.in
					}

					employee.save();

					io.sockets.emit('employeeLog', {
						reference: lastLog._id,
						employee: `${employee.firstName} ${employee.lastName}`,
						status: "in",
					})

					resolve({
						status: 200,
						message: `${employee.firstName} ${employee.lastName} successfully clocked-in! (${moment().format('lll')})`
					})

				}

			}

		} catch (error) {
			return resolve({
				status: 500,
				message: `Server Error: \n${error.message}`
			})
		}
	}); // promise

} // end