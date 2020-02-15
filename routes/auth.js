const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendMail } = require("../utility/mailer");

// import User
const { User } = require("../db/models/User");

module.exports = (io) => {
	// POST /auth
	// Description: authenticate admin user (for login)
	router.post("/", (req, res) => {
		email = req.body.email;
		password = req.body.password;

		User.findById({

		})

		User.findOne({ email }, (err, user) => {
			if (err)
				return res
					.status(500)
					.send({ message: "Error on the server." });
			if (!user)
				return res
					.status(404)
					.send({ message: `User does not exist.` });

			// compare password
			let validPassword = bcrypt.compareSync(password, user.password);

			if (!validPassword) {
				//
				res.status = 401;
				return res.send({
					auth: false,
					token: null,
					message: "Invalid username or password."
				});
			}

			else {

				let { email, firstname, lastname } = user;

				// valid credentials = Create SESSION
				req.session.username = firstname + lastname;
			}



			res.status(200).send({ token, username, firstname, lastname });
		});
	});

	router.get('/logout', (req, res) =>{

		//req.session.destroy()
		//sendstatus 200 success to redirect frontend in vue

	});

	// POST /auth/reset-password
	// Description:
	router.get("/reset-password", (req, res) => {
		// generate link for password reset
		// localhost:$PORT/changepass/$username/$token
		// redirect to confirmed password reset request

		sendMail()
			.then(() => {
				console.log("succesfully sent email");
			})
			.catch((err) => console.err(err));

		res.sendStatus(200);
	});

	// debugging --------------------------------------------------------------------------------------------------------------------------
	router.post("/enroll", async (req, res) => {
		try {
			// get username and hash password using bcrypt
			let { username, firstname, lastname } = req.body;
			let $_hashedPassword = bcrypt.hashSync(req.body.password, 8);

			// create a new user of type [User]
			let newUser = new User({
				username: username,
				firstname: firstname,
				lastname: lastname,
				password: $_hashedPassword
			});

			// save user to db
			let user = await newUser.save();

			var token = jwt.sign({ id: user._id }, process.env.JWT_KEY, {
				expiresIn: 86400 //expires in 24 hours
			});

			res.status(200).send({ auth: true, token });
		} catch (error) {
			console.log(error);
			res.status(500).send("There was a problem registering the user.");
		}
	});

	return router;
};
