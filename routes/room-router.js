// OUR ROUTES ASSOCIATED WITH ROOMS

const express        = require("express");
const passport       = require("passport");
const router         = express.Router();
const ensureLogin    = require( "connect-ensure-login" );

const User           = require("../models/user-model")
const Room           = require("../models/room-model")
const Wall           = require("../models/wall-model")


////// MIDDLEWARES
//////////////////////////////////////////////////////////////////////////////////

router.use( ensureLogin.ensureLoggedIn("/") );




////// ROUTES
//////////////////////////////////////////////////////////////////////////////////

// This is my route to individual group page
router.get('/groups/:groupId', (req, res, next) => {

        Room.findById(req.params.groupId, "members", (err, room) => {
                var promises = room.members.map((m) => 
                    User.findById(m, "fullName")
                )

                Promise.all(promises)
                       .then((users) => {
                           console.log(users)
                            res.locals.memberList = users.map((m) => m.fullName)
                            res.locals.gId = req.params.groupId
                            res.locals.roomId = req.params.groupId
                            res.render('room-views/my-room');
                       })
                       .catch((err) => {
                            next(err)
                       })      
            })

    })




// render rooms-list page with user's rooms
router.get("/my-rooms", (req, res, next) => {
    Room.find({members: req.user._id }) //will find only the rooms whose user is the logged-in user.
    .populate("members")
    .then((roomsFromDb) => {
        res.locals.roomList = roomsFromDb;
        res.render("rooms-list");
    })
    .catch((err) => {
        next(err);
    })
});



//CREATE A NEW ROOM/GROUP IN THE DATABASE
router.post("/process-room/", (req, res, next) => {
    const { name, description, pictureUrl } = req.body;
    console.log( req.body );
    const administratorId = req.user._id;
    const members = req.user._id;
    Room.create({ name, description, pictureUrl, members, administratorId })

        .then(() => {
            console.log("success Room created!");
            res.redirect("/my-rooms");
        })
        .catch((err) => {
            next(err);
        })
});


// //INVITE FRIENDS/PARTICIPANTS
router.post('/process-search', (req, res, next) => {
    const { name, roomId } = req.body;
    console.log(roomId)
    User.find({fullName : name})
        .then((users) => {
            var searchResults = [];
            users.forEach((u) => {
                searchResults.push({
                    userId: u._id,
                    userName: u.fullName
                })
            })
            console.log(searchResults)
            res.locals.searchResults = searchResults;
            res.locals.roomId = roomId;
            res.render("room-views/my-room", { searchResults, roomId })
            // if you find a name that matches in DB
            //then, print those names and buttons that say (send group invite)and you notify them by email
            //when you click on group invite, they appear in the group and the group appears to them
        }) 
        .catch((err) => {
            next(err);
        })
})

router.post("/add-user-to-room", (req, res, next) => {
    const { userId, roomId } = req.body;

    console.log(req.body)
    Room.update(
        { _id: roomId }, 
        { $push : { members : { _id: userId } } }
    ).then(() => {
        console.log("Added user " + userId + " to room " + roomId)
        res.redirect(`/groups/${roomId}`)
    })
})

// render wish-list page with user's list
// router.get("/wishlist:userId", (req, res, next) => {
//     Wall.find({ownerId: req.user._id }) //will find only the list whose user is the logged-in user.
//     //.populate("members")
//     .then((wishlistFromDb) => {
//         res.locals.wallList = wishlistFromDb;
//         res.render("room-views/my-wishlist");
//     })
//     .catch((err) => {
//         next(err);
//     })
// });





//CREATE A NEW ITEM IN THE WISHLIST AND IN THE DATABASE
router.post("/process-wishlist-item", (req, res, next) => {
    const { name, description, pictureUrl, price } = req.body;
    const owner = req.user._id;

    Wall.create({ name, description, pictureUrl, price})
        .then(() => {
            User.find()
            .then(() => {
                res.render("room-views/my-room")
            })
            //res.locals.roomId = roomId;
            // console.log("success Item created!");
            // //res.redirect(`/groups/${roomId}`);
            // res.render("room-views/my-room")

    
        .catch((err) => {
            next(err);
        })
});
});
            


module.exports = router;
