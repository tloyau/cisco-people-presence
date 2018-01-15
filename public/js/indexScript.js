$(function() {
    var socket = io.connect();
    var dataBody = $("#dataBody");

    var lineChartCanvas = null;
    var radarChartCanvas = null;

    var codecs = {};

    refreshAt(00, 00, 00);

    createCharts();

    $.get("/getCodecs", function(rows) {
        var status = "FREE";
        var badge = "bg-success";
        var count = "No";

        for (var row in rows) {
            (function(row) {
                $.post("/getLastEventOfCodec", {
                    ip: rows[row].IP_ADDRESS
                }, function(data) {
                    for (var element in data) {
                        if (data[element].NAME == "PeoplePresence") {
                            if (data[element].VALUE == "Yes") {
                                status = "BUSY";
                                badge = "bg-danger";
                                count = "Yes";
                            }
                        } else if (data[element].NAME == "PeopleCount") {
                            if (data[element].VALUE > 0) {
                                status = "BUSY";
                                badge = "bg-danger";
                                count = data[element].VALUE;
                                break;
                            }
                        }
                    }

                    $("#bodyCodecs").append('' +
                        '<div class="col" id = "' + rows[row].IP_ADDRESS.replace(/\./g, '-') + '">' +
                        '<div class="card card-1 border-0 ' + badge + ' text-white">' +
                        '<div class="card-body text-center">' +
                        '<div class="row d-flex justify-content-around">' +
                        '<div class="col-auto d-flex flex-column justify-content-center">' +
                        '<h4 class="m-0">' + rows[row].DEVICE_NAME + '</h4>' +
                        '<h5 class="m-0 mt-2"><span class="badge badge-pill badge-light">' + rows[row].DEVICE_TYPE + '</span></h5>' +
                        '</div>' +
                        '<div class="col-auto d-flex flex-column justify-content-center">' +
                        '<h5 class="m-0 lead">Status</h5>' +
                        '<h3 class="m-0 mt-2"><span class="badge badge-pill badge-dark">' + status + '</span></h3>' +
                        '</div>' +
                        '<div class="col-auto d-flex flex-column justify-content-center">' +
                        '<h5 class="m-0 lead">People(s)</h5>' +
                        '<h3 class="m-0 mt-2"><span class="badge badge-pill badge-dark">' + count + '</span></h3>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>');

                    codecs[rows[row].IP_ADDRESS.replace(/\./g, '-')] = {};
                    codecs[rows[row].IP_ADDRESS.replace(/\./g, '-')].shadow = false;

                    var cardElement = $("#" + rows[row].IP_ADDRESS.replace(/\./g, '-')).find('.card');

                    if (status == "BUSY") {
                      cardElement.addClass("addShadow");
                      codecs[rows[row].IP_ADDRESS.replace(/\./g, '-')].shadow = true;
                    }
                });
            })(row);
        }
    });

    socket.on("getLastData", function(message) {
        $.get("/getLastData", function(row) {
            var status, badge, count, shadow = null;

            var hasShadow = codecs[row.IP_ADDRESS.replace(/\./g, '-')].shadow;

            if ((row.VALUE == "Yes") || (row.VALUE > 0)) {
                status = "BUSY";
                badge = "bg-danger";

                if (row.VALUE > 0) {
                    count = row.VALUE;
                } else {
                    count = "Yes";
                }
            } else {
                status = "FREE";
                badge = "bg-success";
                count = "No";
            }

            if (hasShadow) {
                shadow = "card-5";
            } else {
                shadow = "card-1";
            }

            $("#" + row.IP_ADDRESS.replace(/\./g, '-')).replaceWith('' +
                '<div class="col" id = "' + row.IP_ADDRESS.replace(/\./g, '-') + '">' +
                '<div class="card ' + shadow + ' border-0 ' + badge + ' text-white">' +
                '<div class="card-body text-center">' +
                '<div class="row d-flex justify-content-around">' +
                '<div class="col-auto d-flex flex-column justify-content-center">' +
                '<h4 class="m-0">' + row.DEVICE_NAME + '</h4>' +
                '<h5 class="m-0 mt-2"><span class="badge badge-pill badge-light">' + row.DEVICE_TYPE + '</span></h5>' +
                '</div>' +
                '<div class="col-auto d-flex flex-column justify-content-center">' +
                '<h5 class="m-0 lead">Status</h5>' +
                '<h3 class="m-0 mt-2"><span class="badge badge-pill badge-dark">' + status + '</span></h3>' +
                '</div>' +
                '<div class="col-auto d-flex flex-column justify-content-center">' +
                '<h5 class="m-0 lead">People(s)</h5>' +
                '<h3 class="m-0 mt-2"><span class="badge badge-pill badge-dark">' + count + '</span></h3>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>');

            var cardElement = $("#" + row.IP_ADDRESS.replace(/\./g, '-')).find('.card');

            if (status == "BUSY") {
                if (!hasShadow) {
                    cardElement.addClass("addShadow");
                    codecs[row.IP_ADDRESS.replace(/\./g, '-')].shadow = true;
                }
            } else {
                if (hasShadow) {
                    cardElement.addClass("removeShadow");
                    codecs[row.IP_ADDRESS.replace(/\./g, '-')].shadow = false;
                }
            }
        });
    });

    function createCharts() {
        $.get("/getCharts", function(charts) {
            var tabsDivCharts = [$("#firstChart"), $("#secondChart")];

            var tabsIPCharts = new Array();

            for (var chart in charts) {
                (function(chart) {
                    var idChart = charts[chart].ip.replace(/\./g, "");

                    if (charts[chart].typeChart == "line") {
                        tabsDivCharts[chart].parent().prepend('<div class="alert alert-warning hidden text-center p-1" role="alert">No data for this date</div>');

                        tabsDivCharts[chart].parent().prepend('' +
                            '<form class="form-inline mb-3">' +
                            '<div class="form-group">' +
                            '<small class="text-muted"><label for="dateInputDay' + idChart + '">' +
                            'Choose a day</label></small>' +
                            '<div class="input-group ml-2">' +
                            '<div class="input-group-addon"><i class="fa fa-calendar" aria-hidden="true"></i></div>' +
                            '<input id="dateInputDay' + idChart + '"' +
                            ' type="text" class="form-control text-center text-muted" data-provide="datepicker">' +
                            '</div>' +
                            '</div>' +
                            '</form>');

                        $("#dateInputDay" + idChart).datepicker({
                            format: 'dd/mm/yyyy',
                            weekStart: 1
                        });

                        $("#dateInputDay" + idChart).datepicker("setDate", moment().subtract(1, 'days').format("DD/MM/YYYY"));

                        $("#dateInputDay" + idChart).change(function() {
                            var date = moment($("#dateInputDay" + idChart).val(), "DD/MM/YYYY").format("dddd DD MMMM YYYY");
                            createLineChart(tabsDivCharts[chart], charts[chart].ip, date);
                        });

                        $("#dateInputDay" + idChart).trigger("change");
                    } else if (charts[chart].typeChart == "radar") {
                        tabsDivCharts[chart].parent().prepend('<div class="alert alert-warning hidden text-center p-1" role="alert">No data for this week</div>');

                        tabsDivCharts[chart].parent().prepend('' +
                            '<form class="form-inline mb-3">' +
                            '<div class="form-group">' +
                            '<small class="text-muted"><label for="dateInputWeek' + idChart + '">' +
                            'Choose a start of week</label></small>' +
                            '<div class="input-group ml-2">' +
                            '<div class="input-group-addon"><i class="fa fa-calendar" aria-hidden="true"></i></div>' +
                            '<input id="dateInputWeek' + idChart + '"' +
                            ' type="text" class="form-control text-center text-muted" data-provide="datepicker">' +
                            '</div>' +
                            '</div>' +
                            '</form>');

                        $("#dateInputWeek" + idChart).datepicker({
                            format: 'dd/mm/yyyy',
                            weekStart: 1
                        });

                        $("#dateInputWeek" + idChart).datepicker("setDate", moment().subtract(1, 'weeks').format("DD/MM/YYYY"));

                        $("#dateInputWeek" + idChart).change(function() {
                            var date = moment($("#dateInputWeek" + idChart).val(), "DD/MM/YYYY").format("dddd DD MMMM YYYY");
                            createRadarChart(tabsDivCharts[chart], charts[chart].ip, date);
                        });

                        $("#dateInputWeek" + idChart).trigger("change");
                    }
                })(chart);
            }
        });
    }

    function createLineChart(divChart, ip, date) {
        $.post("/getLast24HData", {
            codec: ip,
            date: date
        }, function(data) {
            $.post("/getCodec", {
                ip: ip
            }, function(codec) {
                buildDataLineChart(divChart, data, codec.DEVICE_NAME, date);
            });
        });
    }

    function createRadarChart(divChart, ip, date) {
        $.post("/getMaxDataEachDay", {
            codec: ip,
            date: date
        }, function(data) {
            $.post("/getCodec", {
                ip: ip
            }, function(codec) {
                buildDataRadarChart(divChart, data, codec.DEVICE_NAME, date);
            });
        });
    }

    function buildDataLineChart(divChart, data, codec, date) {
        var labelsTab = new Array();
        var dataTab = new Array();

        var maxValue = 0;
        var dataSize = Object.keys(data).length;

        if (dataSize > 0) {
            for (var i = 0; i < 24; ++i) {
                var currentHour = moment(data[0].date).hour(i).startOf('hour').format("YYYY-MM-DD HH:mm:ss");
                var hourDisplay = moment(data[0].date).hour(i).startOf('hour').format("HH") + "h";

                var valueExist = false;

                labelsTab.push(hourDisplay);

                for (var element in data) {
                    if (data[element].date == currentHour) {
                        if (data[element].value > 0) {
                            dataTab.push(data[element].value);
                            valueExist = true;
                        }

                        if (parseInt(data[element].value) > maxValue) {
                            maxValue = data[element].value;
                        }
                    }
                }

                if (!valueExist) {
                    dataTab.push(0);
                }
            }
        }

        var sum = 0;

        for (var i = 0; i < 24; ++i) {
            sum += parseInt(data[i], 10);
        }

        var meanValue = sum / 24;

        maxValue = parseInt(maxValue);
        maxValue += 1;

        lineChart(divChart, codec, dataTab, labelsTab, date, maxValue, meanValue);
    }

    function buildDataRadarChart(divChart, data, codec, date) {
        var dataSize = Object.keys(data).length;

        if (dataSize > 0) {
            var newData = {};

            for (var i = 0; i < 7; ++i) {
                newData[i] = {};
                newData[i].date = moment(data[0].date).startOf('week').day(i).format("YYYY-MM-DD");
                newData[i].device = data[0].device;
                newData[i].value = 0;

                for (var element in data) {
                    if (data[element].date == newData[i].date) {
                        newData[i].value += parseInt(data[element].value);
                    }
                }
            }

            data = newData;

            var labelsTab = new Array();
            var dataTab = new Array();

            var maxValue = 0;

            for (var i = 1; i <= 7; ++i) {
                var currentDay = moment(data[0].date).startOf('week').day(i);
                var valueExist = false;

                labelsTab.push(currentDay.format("dddd"));

                for (var element in data) {
                    if (data[element].date == currentDay.format("YYYY-MM-DD")) {
                        dataTab.push(data[element].value);
                        valueExist = true;

                        if (parseInt(data[element].value) > maxValue) {
                            maxValue = data[element].value;
                        }
                    }
                }

                if (!valueExist) {
                    dataTab.push(0);
                }
            }
        }

        var startWeek = "";

        if (dataSize > 0) {
            startWeek = moment(data[0].date).startOf('week').day(1).format("dddd DD MMMM YYYY");
        }

        maxValue = parseInt(maxValue);
        maxValue += 1;

        var stepSize = 1;

        if (maxValue > 1) {
            stepSize = Math.round(maxValue / 10);
        }

        radarChart(divChart, codec, dataTab, labelsTab, maxValue, stepSize);
    }

    function radarChart(divChart, codec, data, labels, valueMax, stepSize) {
        if (radarChartCanvas != null) {
            radarChartCanvas.destroy();
        }

        radarChartCanvas = new Chart(divChart, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: "rgba(21, 127, 252, 0.5)",
                    borderWidth: "0",
                    fill: true
                }]
            },
            options: {
                legend: {
                    display: false
                },
                tooltips: {
                    enabled: false
                },
                title: {
                    display: true,
                    text: codec + " | Number Of People Per Day",
                    fontSize: "20",
                    fontColor: "#212529",
                    position: "top"
                },
                scale: {
                    ticks: {
                        beginAtZero: true,
                        stepSize: stepSize,
                        min: 0,
                        max: valueMax
                    },
                    pointLabels: {
                        fontSize: 16,
                        fontColor: "#212529"
                    }
                },
                layout: {
                    padding: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    }
                }
            }
        });

        if (radarChartCanvas.config.data.labels.length == 0) {
            divChart.prev().removeClass('hidden');
        } else {
            divChart.prev().addClass('hidden');
        }
    }

    function lineChart(divChart, codec, data, labels, date, valueMax, valueMean) {
        if (lineChartCanvas != null) {
            lineChartCanvas.destroy();
        }

        lineChartCanvas = new Chart(divChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ["#157FFC"],
                    borderColor: "#157FFC",
                    borderWidth: "3",
                    fill: false,
                    pointRadius: "3"
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            stepSize: 1,
                            min: 0,
                            max: valueMax
                        },
                        gridLines: {
                            display: true
                        }
                    }],
                    xAxes: [{
                        gridLines: {
                            display: true
                        }
                    }]
                },
                annotation: {
                    annotations: [{
                        type: 'line',
                        mode: 'horizontal',
                        scaleID: 'y-axis-0',
                        value: valueMean,
                        borderColor: '#868E95',
                        borderWidth: 5,
                        label: {
                            enabled: true,
                            content: 'Mean value',
                            fontSize: 16,
                            position: "right",
                            yAdjust: -20,
                            xAdjust: 5
                        }
                    }]
                },
                legend: {
                    display: false
                },
                tooltips: {
                    enabled: false
                },
                title: {
                    display: true,
                    text: codec + " | Number Of People Per Hour",
                    fontSize: "20",
                    fontColor: "#212529",
                    position: "top"
                }
            }
        });

        if (lineChartCanvas.config.data.labels.length == 0) {
            divChart.prev().removeClass('hidden');
        } else {
            divChart.prev().addClass('hidden');
        }
    }

    function refreshAt(hours, minutes, seconds) {
        var now = new Date();
        var then = new Date();

        if (now.getHours() > hours ||
            (now.getHours() == hours && now.getMinutes() > minutes) ||
            now.getHours() == hours && now.getMinutes() == minutes && now.getSeconds() >= seconds) {
            then.setDate(now.getDate() + 1);
        }
        then.setHours(hours);
        then.setMinutes(minutes);
        then.setSeconds(seconds);

        var timeout = (then.getTime() - now.getTime());
        setTimeout(function() {
            window.location.reload(true);
        }, timeout);
    }
});
