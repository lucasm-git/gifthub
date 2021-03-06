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

// This is my route to individual group page (/:wallUserId)?
router.get('/groups/:groupId/:userId', (req, res, next) => {
    var members = [];
    const currentRoomId = req.params.groupId;
    const wallUserId = req.params.userId;
    const myUserId = req.user._id.toString(); // Don't know why, but this works...

    // const isPoster = wall.wishlist.postedBy._id.toString() == myUserId;
    
    const isMyWall = wallUserId == myUserId // hbs doesn't support equal if statements...
    //const adminId = room.administratorId;

    Room.findById(req.params.groupId)
        .then(room => {
             const adminId = room.administratorId.toString();
             return Room.findById(req.params.groupId)
             .populate("members")
             .exec()
             .then(room => {
                 // // create a list of only ids
                 // res.locals.memberList = populatedRooms.members.map(u => u._id)
                 // const listOfIds = res.locals.memberList;    
                 // // remove current user's id
                 // listOfIds.splice(members.indexOf(req.member._id), 1)
                     
                 // // add it to the beginning
                 // listOfIds.unshift(req.member._id)
                 const isAdmin = adminId == myUserId
                 
                 const wallUser = room.members.find(m => (m._id.toString() == wallUserId)); 
     
                 const myUser = room.members.find(m => (m._id.toString() == myUserId)); // pick only the current user
                 members.push({  // move to top
                     name: myUser.fullName,  
                     isNormalUser: false,
                     link: `/groups/${currentRoomId}/${myUserId}`
                 });
                
                 members = members.concat(
                     room.members
                         .filter(m => m._id.toString() !== myUserId) // remove the current usern //TODO
                         .map(function(member){
                             return {
                                 id: member._id,
                                 name: member.fullName,
                                 roomId: currentRoomId,
                                 isNormalUser: true,
                                 link: `/groups/${currentRoomId}/${member._id}`
                             } 
                         })
                     )
     
                     //http://mongoosejs.com/docs/populate.html
                 const promises = room.members
                                      .find(u => u._id == wallUserId)
                                      .walls
                                      .map(wId => Wall.findById(wId)
                                                      .populate([{ path: 'wishlist.claimedBy', 
                                                                   select:'fullName'},
                                                                   {
                                                                       path: 'comments.creator', 
                                                                       select:'fullName'
                                                                    }]))
                                                                //   ,
                                                                // 'comments.creator'))
     
                 return Promise.all(promises)
                     .then(walls => {
                         
                         
                         const currentWall = walls.find(w => w.roomId == currentRoomId)

                         if(currentWall.wishlist){
                            console.log(currentWall)
                         }
                         if( isMyWall ) {
                             currentWall.wishlist = currentWall.wishlist.filter( i => i.postedBy.toString() == myUserId )
                         }

                         res.locals.wall = currentWall
                         res.locals.memberList = members;
                         res.locals.roomId = currentRoomId;
                         res.locals.wallUser = wallUser;
                         res.locals.isMyWall = isMyWall;
                         res.locals.userId = req.user._id
                         res.locals.isAdmin = isAdmin;
                        //  res.locals.isPoster = isPoster;
                 
                         res.render('room-views/my-room');
                     })
        })
    // need to find admin Id

    }).catch(err => next(err))

        // Room.findById(req.params.groupId, "members", (err, room) => {
        //         var promises = room.members.map((m) => 
        //             User.findById(m, "fullName")
        //         )
        //         // This actually is just what POPULATE does!
        //         Promise.all(promises)
        //                .then((users) => {
        //                    console.log(users)
        //                     res.locals.memberList = users.map((m) => m.fullName)
        //                     res.locals.gId = req.params.groupId
        //                     res.locals.roomId = req.params.groupId
                            
        //                     res.render('room-views/my-room');
        //                })
        //                .catch((err) => {
        //                     next(err)
        //                })      
        //     })

})

// render rooms-list page with user's rooms
router.get("/my-rooms", (req, res, next) => {
    Room.find({members: req.user._id }) //will find only the rooms whose user is the logged-in user.
        .populate("members")
        .then((roomsFromDb) => {
            res.locals.roomList = roomsFromDb.map(function (room) {
                return { 
                    name: room.name, 
                    description: room.description, 
                    link: `/groups/${room._id}/${req.user._id}`
                }
            });
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
        .then(( room ) => {
            Wall.create({
                ownerId: administratorId,
                roomId: room._id,
            })
            .then(wall => {
                User.update({ _id: administratorId },{ $push : { walls : wall._id } })
                .then(() => {
                    console.log("Added user " + administratorId + " to room " + roomId)
                    res.redirect(`/groups/${roomId}`)
                })
                .catch(( err ) => {
                    next( err );
                });


            console.log("success Room created!");
            res.redirect("/my-rooms");
        })
        .catch((err) => {
            next(err);
        });
    });
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
            res.locals.displaySearch = true // just to get back to the search page
            res.render("room-views/my-room")
            // if you find a name that matches in DB
            //then, print those names and buttons that say (send group invite)and you notify them by email
            //when you click on group invite, they appear in the group and the group appears to them
        }) 
        .catch((err) => {
            next(err);
        })
})

// ADD USER IN ROOM
router.post("/add-user-to-room", (req, res, next) => {
    const { userId, roomId } = req.body;
    const myUserId = req.user._id;

    console.log(req.body)
    Room.update(
        { _id: roomId }, 
        { $push : { members : { _id: userId } } }
    ).then(() => {
        Wall.create({
            ownerId: userId,
            roomId,
        }).then(wall => {
            User.update({ _id: userId },{ $push : { walls : wall._id } }
            ).then(() => {
                console.log("Added user " + userId + " to room " + roomId)
                res.redirect(`/groups/${roomId}/${myUserId}`)
            })
        })
      
    })
})

// KICK USER OUT
router.post("/remove-user-from-room", (req, res, next) => {
    
    const { userToDelete, roomId } = req.body;
    const myUserId = req.user._id;
    console.log("Removing "+userToDelete+" from room "+roomId)
    
    Room.findById(roomId)
        .then(room => { // Not sure why... https://stackoverflow.com/questions/42474045/mongoose-remove-element-in-array-using-pull
            room.members.pull(userToDelete)
            return room.save()
        }).then(() => {
            res.redirect(`/groups/${roomId}/${myUserId}`)
        }).catch(err => next(err))

    //Delete wall too?
})

// PRETTY SURE WE DON'T NEED THIS ANYMORE?
// :::::::::::::::::::::::::::::::::::::::
// // render wish-list page with user's list
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
    const { title, description, pictureUrl, price, roomId, wallId, userId } = req.body;

    const myUserId = req.user._id
    const postedBy = userId;

    console.log(req.body)
    Wall.findByIdAndUpdate({ _id: wallId },
                { $push : { wishlist: { title, description, pictureUrl, price, postedBy } } })
        .then((wall) => {
            res.redirect(`/groups/${roomId}/${wall.ownerId}`)

        })
        .catch((err) => {
            next(err);
        })
});


//CREATE A NEW ITEM IN THE COMMENTS AND IN THE DATABASE
router.post("/process-comments", (req, res, next) => {
    const { creator, message, roomId, wallId, userId } = req.body;

    const myUserId = req.user._id
    // const owner = req.user._id;
    console.log(req.body)
    Wall.findByIdAndUpdate({ _id: wallId },
        { $push : { comments: { creator: userId, message } } })
        .then((wall) => {
            res.redirect(`/groups/${roomId}/${wall.ownerId}`)
        })
        .catch((err) => {
            next(err);
        })
});

//CLAIM A GIFT AND ADD IN THE DATABASE
router.post('/process-claim', (req, res, next) => {
    const { roomId, wallId, item } = req.body;
    const myUserId = req.user._id

    Wall.findById(wallId)
        .then((wall) => {
            console.log(wall)
            var claimedItem = wall.wishlist.find(i => {
                console.log(i)
                console.log(item)
                // console.log(typeof i.title)
                // console.log(typeof item)
                return i.title == item
            })
            console.log(wall)

            wall.populate()
            claimedItem.claimedBy = new User({ _id: myUserId})
            return wall.save()
                        

        })
        .then((wall) => {
            res.redirect(`/groups/${roomId}/${wall.ownerId}`)
        })
        .catch(next)

})


module.exports = router;
