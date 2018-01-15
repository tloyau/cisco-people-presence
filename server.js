var express = require("express");
var request = require("request");
var http = require('http');
var ip = require('ip');
var parseString = require('xml2js').parseString;
var bodyParser = require('body-parser');
var moment = require('moment');
require('body-parser-xml')(bodyParser);
var inspect = require('util').inspect;
var config = require("./config.json");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('roomkit');

db.run("SELECT * FROM CODEC", function(err, row) {
    if (err) {
        console.log('Création des tables CODEC et STATUS');

        db.run("CREATE TABLE CODEC(ID INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "DEVICE_NAME TEXT NOT NULL, DEVICE_TYPE TEXT NOT NULL, IP_ADDRESS TEXT NOT NULL, " +
            "MAC_ADDRESS TEXT NOT NULL, USERNAME TEXT NOT NULL, PASSWORD TEXT NOT NULL)",
            function() {
                for (var codec in config.codecs) {
                    (function(codec) {
                        var dataCodec = config.codecs[codec];

                        db.run("INSERT INTO CODEC(DEVICE_NAME, DEVICE_TYPE, IP_ADDRESS, MAC_ADDRESS, USERNAME, PASSWORD) " +
                            "VALUES ($name, $type, $ip, $mac, $username, $password)", {
                                $name: codec,
                                $type: dataCodec.type,
                                $ip: dataCodec.ip_address,
                                $mac: dataCodec.mac_address,
                                $username: dataCodec.username,
                                $password: dataCodec.password
                            });
                    })(codec);
                }
            });

        db.run("CREATE TABLE STATUS(ID INTEGER PRIMARY KEY AUTOINCREMENT, NAME TEXT NOT NULL, " +
            "VALUE TEXT NOT NULL, DATE TEXT NOT NULL, CODEC_ID INTEGER references CODEC(ID) ON DELETE CASCADE)");
    }
});

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.xml());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(__dirname + '/public'));

app.post("/presence", function(req, res) {
    var name, value, date, codec_id, mac_address = "";

    // console.log(inspect(req.body, {
    //     colors: true,
    //     depth: Infinity
    // }));

    if (req.body.Status.RoomAnalytics[0].PeoplePresence) {
        name = "PeoplePresence";
        value = req.body.Status.RoomAnalytics[0].PeoplePresence[0];
    } else if (req.body.Status.RoomAnalytics[0].PeopleCount) {
        name = "PeopleCount";
        value = req.body.Status.RoomAnalytics[0].PeopleCount[0].Current[0];
    }

    date = moment().format("YYYY-MM-DD HH:mm:ss");

    mac_address = req.body.Status.Identification[0].MACAddress[0];
    mac_address = mac_address.toUpperCase();

    db.get('SELECT ID FROM CODEC WHERE MAC_ADDRESS = "' + mac_address + '"', function(err, row) {
        if (err) {
            console.log(err);
        }

        codec_id = row.ID;

        db.run("INSERT INTO STATUS(NAME, VALUE, DATE, CODEC_ID) VALUES ($name, $value, $date, $codec_id)", {
            $name: name,
            $value: value,
            $date: date,
            $codec_id: codec_id
        });
    });

    io.sockets.emit("getLastData");
    res.sendStatus(200);
});

app.get('/getCharts', function(req, res) {
    res.json(config.charts);
});

app.get('/getCodecs', function(req, res) {
    db.all('SELECT * FROM CODEC', function(err, rows) {
        res.json(rows);
    });
});

app.get('/getAllData', function(req, res) {
    db.all('SELECT s.*, c.* FROM STATUS s, CODEC c WHERE s.CODEC_ID = c.ID ORDER BY s.DATE DESC LIMIT 100', function(err, rows) {
        res.json(rows);
    });
});

app.get('/getLastData', function(req, res) {
    db.get('SELECT s.*, c.* FROM STATUS s, CODEC c WHERE s.CODEC_ID = c.ID ORDER BY s.DATE DESC', function(err, row) {
        res.json(row);
    });
});

app.post('/getLastEventOfCodec', function(req, res) {
    var codec = req.body.ip;

    db.all('SELECT c.IP_ADDRESS, s.* FROM STATUS s, CODEC c WHERE s.CODEC_ID = c.ID AND c.IP_ADDRESS = "' + codec + '" GROUP BY s.NAME ORDER BY s.DATE DESC', function(err, rows) {
        res.json(rows);
    });
});

app.post('/getCodec', function(req, res) {
    db.get('SELECT * FROM CODEC WHERE IP_ADDRESS = "' + req.body.ip + '"', function(err, row) {
        res.json(row);
    });
});

app.post('/getMaxDataEachDay', function(req, res) {
    // for (var i = 1; i <= 7; ++i) {
    //     for (var j = 0; j < 24; ++j) {
    //         db.run("INSERT INTO STATUS(NAME, VALUE, DATE, CODEC_ID) VALUES ($name, $value, $date, $codec_id)", {
    //             $name: "PeopleCount",
    //             $value: Math.floor((Math.random() * 10) + 1),
    //             $date: moment().subtract(1, 'weeks').day(i).hour(j).format("YYYY-MM-DD HH:mm:ss"),
    //             $codec_id: 2
    //         });
    //     }
    // }

    var codec = req.body.codec;
    var date = req.body.date;

    var lastWeekStart = moment(date).startOf('week').day(1).format("YYYY-MM-DD HH:mm:ss");
    var lastWeekEnd = moment(date).endOf('week').day(7).format("YYYY-MM-DD HH:mm:ss");

    db.all('SELECT c.DEVICE_NAME as "device", max(s.VALUE) as "value", strftime("%Y-%m-%d", s.DATE) as "date" ' +
        'FROM STATUS s, CODEC c ' +
        'WHERE s.CODEC_ID = c.ID AND s.NAME = "PeopleCount" AND s.VALUE != "-1" ' +
        'AND s.DATE BETWEEN "' + lastWeekStart + '" AND "' + lastWeekEnd + '" AND c.IP_ADDRESS = "' + codec + '" GROUP BY strftime("%Y-%m-%d %H", s.DATE)',
        function(err, rows) {
            res.json(rows);
        });
});

app.post('/getLast24HData', function(req, res) {
    // for (var i = 0; i < 24; ++i) {
    // 	db.run("INSERT INTO STATUS(NAME, VALUE, DATE, CODEC_ID) VALUES ($name, $value, $date, $codec_id)", {
    // 		$name: "PeopleCount",
    // 		$value: Math.floor((Math.random() * 10) + 1),
    // 		$date: moment().subtract(1, 'days').hour(i).format("YYYY-MM-DD HH:mm:ss"),
    // 		$codec_id: 1
    // 	});
    // }

    // for (var i = 0; i < 24; ++i) {
    //     db.run("INSERT INTO STATUS(NAME, VALUE, DATE, CODEC_ID) VALUES ($name, $value, $date, $codec_id)", {
    //         $name: "PeopleCount",
    //         $value: Math.floor((Math.random() * 10) + 1),
    //         $date: moment().subtract(1, 'weeks').day(2).hour(i).format("YYYY-MM-DD HH:mm:ss"),
    //         $codec_id: 2
    //     });
    // }

    var codec = req.body.codec;
    var date = req.body.date;

    var yesterdayStart = moment(date).startOf('day').format("YYYY-MM-DD HH:mm:ss");
    var yesterdayEnd = moment(date).endOf('day').format("YYYY-MM-DD HH:mm:ss");

    db.all('SELECT c.IP_ADDRESS as "ip", c.DEVICE_NAME as "device", max(s.VALUE) as "value", strftime("%Y-%m-%d %H:00:00", s.DATE) as "date" ' +
        'FROM STATUS s, CODEC c ' +
        'WHERE s.CODEC_ID = c.ID AND s.NAME = "PeopleCount" ' +
        'AND s.DATE BETWEEN "' + yesterdayStart + '" AND "' + yesterdayEnd + '" AND c.IP_ADDRESS = "' + codec + '" GROUP BY strftime("%Y-%m-%d %H", s.DATE)',
        function(err, rows) {
            res.json(rows);
        });
});

app.get('/', function(req, res) {
    res.sendFile('index.html');
});

var server = http.createServer(app);
var io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket) {
    socket.emit("getAllData");
});

server.listen(config.port);
console.log("Running at Port " + config.port);

checkPresenceDectector();

setInterval(function() {
    checkPresenceDectector();
}, config.checkPresenceTimeInterval);

function checkPresenceDectector() {
    db.all('SELECT * FROM CODEC', function(err, codecs) {
        for (var codec in codecs) {
            (function(codec) {
                var dataCodec = codecs[codec];

                request({
                        method: 'GET',
                        url: "http://" + dataCodec.IP_ADDRESS + "/getxml?location=/Configuration/RoomAnalytics",
                        headers: {
                            "Authorization": "Basic " + new Buffer(dataCodec.USERNAME + ":" + dataCodec.PASSWORD).toString("base64")
                        }
                    },
                    function(error, response, body) {
                        if (error) {
                            console.log(error);
                        }

                        parseString(body, function(err, result) {
                            if (result) {
                                if (result.Configuration.RoomAnalytics[0].PeoplePresenceDetector[0]._ == "On") {
                                    console.log("Codec " + dataCodec.DEVICE_NAME + " : Détection de la présence activée !");

                                    if (result.Configuration.RoomAnalytics[0].PeopleCountOutOfCall != undefined) {
                                        if (result.Configuration.RoomAnalytics[0].PeopleCountOutOfCall[0]._ == "On") {
                                            console.log("Codec " + dataCodec.DEVICE_NAME + " : Détection du compteur de personnes activé !");
                                            registerFeedback(dataCodec);
                                        } else {
                                            console.log("La détection du compteur de personnes est désactivé sur le codec " + dataCodec.DEVICE_NAME + ", veuillez le réactiver !");
                                        }
                                    } else {
                                        registerFeedback(dataCodec);
                                    }
                                } else {
                                    console.log("La détection de la présence est désactivée sur le codec " + dataCodec.DEVICE_NAME + ", veuillez la réactiver !");
                                }
                            } else {
                                if (body != undefined) {
                                    if (body.includes("401")) {
                                        console.log("Login invalide sur le codec " + dataCodec.DEVICE_NAME + ", veuillez vérifier les identifiants !");
                                    }
                                }
                            }
                        });
                    }
                );
            })(codec);
        }
    });
}

function registerFeedback(codec) {
    var xml = "<Command>" +
        "<HttpFeedback>" +
        "<Register command=\"True\">" +
        "<FeedbackSlot>2</FeedbackSlot>" +
        "<ServerUrl>" + "http://" + ip.address() + ":" + config.port + "/presence" + "</ServerUrl>" +
        "<Format>XML</Format>" +
        "<Expression item=\"1\">/Status/RoomAnalytics</Expression>" +
        "</Register>" +
        "</HttpFeedback>" +
        "</Command>";

    request({
            method: 'POST',
            url: "http://" + codec.IP_ADDRESS + "/putxml",
            headers: {
                "Authorization": "Basic " + new Buffer(codec.USERNAME + ":" + codec.PASSWORD).toString("base64"),
                "Content-Type": "text/xml"
            },
            body: xml
        },
        function(error, response, body) {
            if (error) {
                console.log(error);
            }

            parseString(body, function(err, result) {
                if (result.Command.HttpFeedbackRegisterResult[0].$.status == "OK") {
                    console.log("Enregistrement réussi du codec " + codec.DEVICE_NAME + " sur l'URL suivante : " + "http://" + ip.address() + ":" + config.port + "/presence");
                } else {
                    console.log("L'enregistrement du codec " + codec.DEVICE_NAME + " a échoué ! Veuillez réessayer après avoir vérifié les erreurs !");
                }
            });
        }
    );
}

function deregisterFeedback() {
    var nbCodecs = Object.keys(config.codecs).length;
    var cpt = 1;

    setTimeout(function() {
        console.log('RoomKit App Stopping...');
        db.close();
        server.close();
        process.exit(2);
    }, 5000);

    db.all('SELECT * FROM CODEC', function(err, codecs) {
        for (var codec in codecs) {
            (function(codec) {
                var dataCodec = codecs[codec];

                var xml = "<Command>" +
                    "<HttpFeedback>" +
                    "<Deregister command=\"True\">" +
                    "<FeedbackSlot>2</FeedbackSlot>" +
                    "</Deregister>" +
                    "</HttpFeedback>" +
                    "</Command>";

                request({
                        method: 'POST',
                        url: "http://" + dataCodec.IP_ADDRESS + "/putxml",
                        headers: {
                            "Authorization": "Basic " + new Buffer(dataCodec.USERNAME + ":" + dataCodec.PASSWORD).toString("base64"),
                            "Content-Type": "text/xml"
                        },
                        body: xml
                    },
                    function(error, response, body) {
                        if (error) {
                            console.log(error);
                        }

                        parseString(body, function(err, result) {
                            if (result) {
                                if (result.Command.HttpFeedbackDeregisterResult[0].$.status == "OK") {
                                    console.log("Suppression réussie du codec " + dataCodec.DEVICE_NAME + " sur l'URL suivante : " + "http://" + ip.address() + ":" + config.port + "/presence");
                                } else {
                                    console.log("Suppression du codec " + dataCodec.DEVICE_NAME + " a échoué ! Veuillez réessayer après avoir vérifié les erreurs !");
                                }
                            } else {
                                if (body != undefined) {
                                    if (body.includes("401")) {
                                        console.log("Login invalide sur le codec " + dataCodec.DEVICE_NAME + ", veuillez vérifier les identifiants !");
                                    }
                                }
                            }

                            if (cpt == nbCodecs) {
                                console.log('RoomKit App Stopping...');
                                db.close();
                                server.close();
                                process.exit(2);
                            } else {
                                ++cpt;
                            }
                        });
                    }
                );
            })(codec);
        }
    });
}

process.on('SIGINT', function() {
    console.log("\nSuppression des feedbacks...");
    deregisterFeedback();
});
