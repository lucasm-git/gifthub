//ALL OUR LOGIN OR SIGNUP STUFF 

const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const nodemailer = require('nodemailer');
const router = express.Router();

const User = require("../models/user-model");
const Invite = require("../models/invitation-model");
const Room = require("../models/room-model");
const Wall = require("../models/wall-model");

// ROUTES
///////////////////////////////////////////////////////

//SIGN UP
router.post("/process-signup", (req, res, next) => {
    const { fullName, email, password, confirmationCode } = req.body;

    console.log(req.body)

    if (fullName === "") {
        res.render("index", { nameMessage: "The name can't be empty!" });
        return;
    }

    if (password === "" || password.length < 5) {
        res.render("index", { passwordMessage: "The password can't be empty, and must be longer than 4 signs!" });
        return;
    }

    if (email === "") {
        res.render("index", { emailMessage: "The email can't be empty!" });
        return;
    }

    const salt = bcrypt.genSaltSync(10);
    const encryptedPassword = bcrypt.hashSync(password, salt);

    // Check if an invite exists for that user (if confirmationCode is valid)
    Invite.findOneAndRemove({ confirmationCode }, "roomsList", (err, invite) => {

        var user = new User({ fullName, email, encryptedPassword });

        user.save((err, user) => {
            console.log("Created user:" + user)
            if (invite) { // If the invite was present, add user to a room
                console.log("Added user to a room" + invite.roomsList[0] + user)
                Room.findByIdAndUpdate(invite.roomsList[0], 
                            { $push: { members: user } })
                    .then((room) => {
                        Wall.create({
                            ownerId: user._id,
                            roomId: room._id
                        }).then(wall => {
                            User.update(
                                { _id: user._id },
                                { $push: { walls: wall._id } }
                            ).then(() => {
                                console.log("Added user " + userId + " to room " +roomId)
                            }).catch(next)
                        }).catch((err) => {
                            next(err)
                        })

                        // Log the user in after signup  
                        req.login(user, () => {
                            res.redirect("/my-rooms");
                        });
                    });
            } else {
                // Log the user in after signup  
                req.login(user, () => {
                    res.redirect("/my-rooms");
                });
            }
        });
    })
});

//SIGN IN
router.post("/process-login", (req, res, next) => {
    const { email, password } = req.body;

    User.findOne({ email })
        .then((userDetails) => {
            if (!userDetails) {
                res.render("index", { noUserMessage: "Seems like you are not in the database, try signing up first!" });
                return;
            }

            const { encryptedPassword } = userDetails;

            if (!bcrypt.compareSync(password, encryptedPassword)) {
                res.render("index", { wrongPasswordMessage: "Oops, maybe you mistyped?" });
                return;
            }

            req.login(userDetails, () => {
                res.redirect("/my-rooms");
            });

        })
        .catch((err) => {
            next(err)
        })
});

//LOGOUT
router.get("/logout", (req, res, next) => {
    req.logout();
    res.redirect("/");
});




//invites a new user with an email
const transport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.gmail_user,
        pass: process.env.gmail_pass
    }
});

// router.post('/process-invite', invite ); could turn this into function later
router.post('/process-invite/:groupId', (req, res, next) => {
    const { fullName, email, confirmationCode, message } = req.body;
    const groupId = req.params.groupId;

    User.findOne({ email }, "email", (err, user) => {
        if (user !== null) {
            res.render("room-views/my-room", { message: "The email already exists" }); // TODO: print message in the room page
            console.log("The email already exists")
            return;
        }

        Invite.findOne({ email }, "email", (err, invite) => {
            if (invite !== null) {
                res.render("room-views/my-room", { message : "The email has already been sent to this user" }); // TODO: print message in the room page
                console.log("The email has already been sent to this user")
                return;
            }

            const salt = bcrypt.genSaltSync(10);
            const hashEmail = bcrypt.hashSync(email, salt).replace(/\W/g, ''); // Sanitize the long string to make sure the link works!

            const newInvite = new Invite({
                email: email,
                confirmationCode: hashEmail,
                roomsList: req.params.groupId //room we want to invite the user to.
            });

            const saveInvite = newInvite.save();

            //let {fullName, email, message} = req.body;
            const sendMail = transport.sendMail({
                from: "GiftHub <maggie@gifthub.com",
                to: email,
                subject: `You have been invited to join GiftHub`,
                text: `Dear ${fullName},
              (insert name of user here) would like to invite you to join GiftHub, the highly-rated and fun gift-exchange application. 
              Please see the following message from (insert name of user here):
              ${message}
              Click on this link http://localhost:3000/confirm/${hashEmail} to sign up and access your new group.
            `,
                html: `Dear ${fullName}, <br/><br/>
              (insert name of user here) would like to invite you to join GiftHub, the highly-rated and fun gift-exchange application. 
              <br/><br/> Please see the following message from (insert name of user here):
              <br/><br/> ${message}
              <br/><br/>
              Click on this link http://localhost:3000/confirm/${hashEmail} to sign up and access your new group <br/>
            `
            })

            Promise.all([saveInvite, sendMail])
                .then(() => {
                    res.redirect(`/groups/${req.params.groupId}/${req.user._id}`);
                })
                .catch((err) => {
                    next(err);
                });
        })
    });
});


router.get('/confirm/:hashEmail', (req, res, next) => {
    
    //req.logout() // Doesn't work :( For testing reason mostly, we want to log out from current user

    res.locals.confirmationCode = req.params.hashEmail
    res.render("index")
})


module.exports = router; 

