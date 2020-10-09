import { Chart } from "chart.js";
import $ from 'jquery';
import _ from 'lodash';


//TODO
// add temperature to result tab. change display number digits.  


export class ResultTab {
    constructor(app) {
        this.perPage = 25
        this.app = app
        this.prevBtn = $('#result-prev')
        this.nextBtn = $('#result-next')
        this.resultSelect = $('#result-select')
        this.refreshBtn = $('#result-refresh')
        this.metaDisplay = $('#result-meta-display')
        this.nameInput = $('#result-name')
        this.expInput = $('#result-exp')
        this.downloadBtn = $('#result-download-btn')
        this.descInput = $('#result-desc')
        this.initWebsocket()
        this.addEventListener()
        this.plot()
        this.page = 0
        this.data = []
        this.allFetched = false
        
    }
    initWebsocket() {
        this.ws = new WebSocket(websocketAddr)

        this.ws.onopen = e => {
            this.requestData(0, this.perPage * 2)
            // <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        }
        this.ws.onclose = e => {

        }

        this.ws.onerror = e => {

        }

        this.ws.onmessage = e => {
            let packet = JSON.parse(e.data);
            let data = packet.data;
            let action = packet.action;
            if (packet.status === 'ok') {
                switch (action) {
                    case 'dataStore.getRecentPaginated':
                        this.refreshBtn.html('<i class="fas fa-sync"></i>')
                        // let oldlength = this.data.length;
                        let item = data.items;
                        this.data = _.unionBy(item, this.data, '_id')
                        this.data.sort((a, b) => {
                            let da = (new Date(a.meta.created)).getTime();
                            let db = (new Date(b.meta.created)).getTime();
                            return db - da
                        })

                        if (!data.hasNext) {
                            this.allFetched = true
                        }
                        
                        this.updatePage()
                        break
                    case "dataStore.getDataFromIndex":
                        this.data = _.unionBy([data], this.data, '_id')
                        this.data.sort((a, b) => {
                            let da = (new Date(a.meta.created)).getTime();
                            let db = (new Date(b.meta.created)).getTime();
                            return db - da
                        })
                        this.updatePage()
                        break
                    case "dataStore.getDataAfterIndex":
                        this.refreshBtn.html('<i class="fas fa-sync"></i>')
                        this.page = 0                        
                        this.data = _.unionBy(data, this.data, '_id')
                        this.data.sort((a, b) => {
                            let da = (new Date(a.meta.created)).getTime();
                            let db = (new Date(b.meta.created)).getTime();
                            return db - da
                        })
                        this.updatePage()
                        break
                    case 'dataStore.deleteDataByIndex':
                        this.app.showToast(packet)
                        break
                    default:
                        // this.app.showToast(packet)
                        break
                }
            } else {
                this.app.showAlert(JSON.stringify(packet), 'danger')
            }
        }

    }
    send(msg) {
        if (this.ws && this.ws.readyState == 1) {
            this.ws.send(JSON.stringify(msg))
        }
    }

    requestData(page, perpage) {         
        this.refreshBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>')
        this.send({ action: "dataStore.getRecentPaginated", page: page, "perpage": perpage, "pwd": "", returnRaw: true })       
    }

    updatePage() {
        // update page
        let data = this.data.slice(this.page * this.perPage, (this.page + 1) * this.perPage)
        let options = data.map((e, i) => {
            let name = e.meta.name || e.meta.error;
            let date = (new Date(e.meta.created)).toLocaleString();
            const sb = { F: "&#8457;", S: "&#x2713;", E: "&times;" }
            let upload = e.upload ? sb[e.upload] + '&nearr;' : "";
            return `<option value=${i}>${upload} ${name} - ${date} &nbsp;&nbsp;&nbsp;</option>`
        })
        this.resultSelect.html(options.join(''))
        if ((this.page + 1) * this.perPage >= this.data.length) {

            this.nextBtn.prop('disabled', true)
        } else {
            this.nextBtn.prop('disabled', false)
        }
        if (this.page) { this.prevBtn.prop('disabled', false) } else { this.prevBtn.prop('disabled', true) }

    }
    fetchNew() {
        // this.fetchingNewDataPage += 1        
        if (this.data.length>0){
            this.refreshBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>')
            this.send({action:'dataStore.getDataAfterIndex',index:this.data[0]._id,pwd:"",returnRaw:true})
        } else {
            this.data=[]
            this.allFetched = false
            this.requestData(0, this.perPage * 2)
        }
    }

    getCurrentSelection() {
        return this.resultSelect.val().map(e => this.page * this.perPage + parseInt(e))
    }

    addEventListener() {
        this.nextBtn.on('click', e => {
            this.page += 1;
            this.updatePage()

            if (!this.allFetched && ((this.page + 2) * this.perPage > this.data.length)) {
                // need to fetch next page 
                this.requestData(this.page + 1, this.perPage)
            }

        });
        this.prevBtn.on('click', e => {
            this.page -= 1;
            this.updatePage();

        })

        this.refreshBtn.on('click', e => {
            this.fetchNew()
        })

        $('#result-delete').on('click',e=>{
            let index = this.getCurrentSelection();
            if(index.length>0) {
                this.app.confirmDialog.confirm(`<h4>Are you sure to delete <strong>${index.length}</strong> data?</h4>`,()=>{
                    index.forEach(idx=>{
                        this.send({'action':'dataStore.deleteDataByIndex',index:this.data[idx]._id})
                    })
                    // remove this data from this.data
                    _.remove(this.data, (data,idx)=>(index.includes(idx)))
                    this.updatePage()
                })                
            }            
        })

        this.downloadBtn.on('click', e => {
            window.open('/download')
        })

        this.resultSelect.on('change', e => {
            let idx = this.getCurrentSelection()
            if (idx.length) {
                // update result meta idsplay 
                let fD = this.data[idx[0]];
                this.metaDisplay.html(`
            <li>Name : ${fD.meta.name}  </li>
            <li>Method : ${fD.meta.method}  </li>
            <li>deltaT : ${fD.meta.deltaT}  </li>
            <li>GoalTemp : ${fD.meta.temp}  </li>
            <li>Status : ${JSON.stringify(fD.status)}  </li>
            <li>Result : ${fD.result}  </li>
            `)
                // update result inputs 
                this.nameInput.val(fD.meta.name)
                this.expInput.val(fD.meta.exp)
                this.descInput.val(fD.meta.desc)
                // update plot

                this.trace.data.datasets = this.getTraceDataset(idx)
                this.trace.update()

            }

        })

        $('#result-save-btn').on('click', e => {
            let idx = this.getCurrentSelection()
            let name = this.nameInput.val()
            let exp = this.expInput.val()
            let desc = this.descInput.val()
            idx.forEach((e, i, arr) => {
                this.data[e].meta.name = arr.length == 1 ? name : `${name}-${i}`;
                this.data[e].meta.exp = exp;
                this.data[e].meta.desc = desc;
                this.send({ action: "dataStore.editMeta", index: this.data[e]._id, meta: this.data[e].meta })
            })
            if (idx.length) { this.updatePage() }

        })

        $('#result-upload-btn').on('click', e => {
            let idx = this.getCurrentSelection();
            idx.forEach((e, i, arr) => {
                let index = this.data[e]._id;
                this.send({ action: 'dataStore.uploadData', index: index })
                setTimeout(() => {
                    this.send({ action: 'dataStore.getDataFromIndex', index: index ,returnRaw:true})
                }, 5000);
            })
        })
    }

    updatePeak(idx, channel, j) {
        let name = this.data[idx].meta.name
        let rawdata = this.data[idx].data.scan[channel].rawdata[j]
        let step = (rawdata[0][1] - rawdata[0][0]) / (rawdata[0][2] - 1);
        let voltage = Array.from({ length: rawdata[0][2] }, (_, k) => (rawdata[0][0] + k * step))
        let fit = this.data[idx].data.scan[channel].fit[j]
        let time = this.data[idx].data.scan[channel].time[j]
        if (rawdata && fit) {
            this.peak.options.title.text = [`${name} - ${channel}`, `${time.toFixed(2)} min - ${fit.pc.toFixed(2)}uA`]
            this.peak.data.datasets[0].data = _.zip(voltage, rawdata[1]).map(([x, y]) => ({ x, y }))
            let pv = fit.pv;
            let pc = fit.pc;
            let k = (fit.fy[1] - fit.fy[0]) / (fit.fx[1] - fit.fx[0])
            let b = - k * fit.fx[1] + fit.fy[1]
            let bp = k * pv + b
            this.peak.data.datasets[1].data = [{ x: pv, y: bp }, { x: pv, y: bp + pc }]
            this.peak.data.datasets[2].data = _.zip(fit.fx, fit.fy).map(([x, y]) => ({ x, y }))//[{x:fit.fx[0],y:fit.fy[0]},{x:fit.fx[0],y:fit.fy[0]}]
            this.peak.update()
        }
    }

    randomFromSeed(a){
        // generate a pseudo random number from input a (number)
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          }
    }

    color(i, channel, FF) {
        /* i is the ith selected data in selection, 
        channel is the C1-C4, 
        FF is true indicate whether this is fluid fill data */
        const red = ['PALEVIOLETRED','MEDIUMVIOLETRED','DEEPPINK','HOTPINK','LIGHTPINK','PINK','DARKRED','FIREBRICK',
                    'RED','CRIMSON','LIGHTSALMON','DARKSALMON','SALMON','LIGHTCORAL','INDIANRED']
        const yellow = ['DARKKHAKI','KHAKI','PALEGOLDENROD','PEACHPUFF','MOCCASIN','PAPAYAWHIP','LIGHTGOLDENRODYELLOW','LEMONCHIFFON',
                        'LIGHTYELLOW','YELLOW','GOLD','ORANGE','DARKORANGE','ORANGERED','TOMATO','CORAL','LIGHTSALMON']
        const purple = ['MEDIUMSLATEBLUE','DARKSLATEBLUE','SLATEBLUE','INDIGO','PURPLE','DARKMAGENTA','DARKORCHID','DARKVIOLET',
                        'BLUEVIOLET','REBECCAPURPLE','MEDIUMPURPLE','MEDIUMORCHID','MAGENTA','FUCHSIA','ORCHID','VIOLET','PLUM','THISTLE','LAVENDER'];
        const green = ['TEAL','DARKCYAN','LIGHTSEAGREEN','DARKSEAGREEN','MEDIUMAQUAMARINE','DARKOLIVEGREEN','OLIVE','OLIVEDRAB',
                        'YELLOWGREEN','DARKGREEN','GREEN','FORESTGREEN','SEAGREEN','MEDIUMSEAGREEN','SPRINGGREEN','MEDIUMSPRINGGREEN',
                        'LIGHTGREEN','PALEGREEN','LIMEGREEN','LIME','LAWNGREEN','CHARTREUSE','GREENYELLOW'];
        const blue = ['MIDNIGHTBLUE','NAVY','DARKBLUE','MEDIUMBLUE','BLUE','ROYALBLUE','MEDIUMSLATEBLUE','CORNFLOWERBLUE',
                        'DODGERBLUE','DEEPSKYBLUE','LIGHTSKYBLUE','SKYBLUE','LIGHTBLUE','POWDERBLUE','LIGHTSTEELBLUE','STEELBLUE',
                        'CADETBLUE','DARKTURQUOISE','MEDIUMTURQUOISE','TURQUOISE','AQUAMARINE','PALETURQUOISE','LIGHTCYAN','CYAN','AQUA']
        const brown = ['MAROON','BROWN','SIENNA','SADDLEBROWN','CHOCOLATE','PERU','DARKGOLDENROD',
                        'GOLDENROD','SANDYBROWN','ROSYBROWN','TAN','BURLYWOOD','WHEAT','NAVAJOWHITE','BISQUE','BLANCHEDALMOND']
        const grey = ['BLACK','DARKSLATEGRAY','SLATEGRAY','LIGHTSLATEGRAY','DIMGRAY','GRAY','DARKGRAY','SILVER','LIGHTGRAY']
        
        const colors = _.flatten([green,blue,red,purple,yellow,brown,grey])
        
        // let seed = i + (channel?channel.slice(1)*7877:3531) + (FF ? 898635 : 17257)
        // let rand = this.randomFromSeed(seed)
        let idx = Math.floor( Math.random()* (colors.length -1 ))
        
        return colors[idx]
        
    }

    getTraceDataset(indexes) {
        // mape the selected data in menu to datasets
        // indexes is the index in this.data array.
        return indexes.flatMap((dataIndex, i) => {
            let d = this.data[dataIndex];
            // generate current Data array
            let currentData = d.data ? (
                _.map(d.data.scan, (data, channel) => {
                    let xyData = _.zip(data.time, data.fit).map(([t, fit]) => ({ x: t ? t.toFixed(2) : 0, y: fit ? fit.pc.toFixed(2) : 0 }))
                    let color = this.color(i, channel);
                    return {
                        label: d.meta.name + '-' + channel,
                        pointHoverBorderColor: this.color(i + 6,channel),
                        xAxisID: 'time',
                        yAxisID: 'current',
                        pointRadius: 2,
                        pointHoverRadius: 6,
                        backgroundColor: color,
                        pointHoverBackgroundColor: color,
                        dataIndex: dataIndex,
                        channel: channel,
                        data: xyData,
                        dataType: 'Current'
                    }
                })

            ) : []

            // generate temperature Data array
            let tempcolor = this.color(i + 999);
            let tempData = { // this is the temperature data
                label: d.meta.name + '-T',
                pointHoverBorderColor: this.color(),
                xAxisID: 'time',
                yAxisID: 'temperature',
                pointRadius: 2,
                pointHoverRadius: 6,
                backgroundColor: tempcolor,
                pointHoverBackgroundColor: tempcolor,
                dataType: 'Temperature',
                data: d.data ? _.zip(d.data.temperature.time, d.data.temperature.data).map(([t, temp]) => ({ x: t ? t.toFixed(2) : 0, y: temp ? temp.toFixed(2) : 0 })) : []
            }

            // conditionally generate fluidFill data array
            let fluidFillData = (d.data && indexes.length == 1) ? (
                _.map(d.data.fluidFill, (data, channel) => {
                    let xyData = _.zip(data.time, data.data).map(([t, d]) => ({ x: t ? t.toFixed(2) : 0, y: d ? d.toFixed(2) : 0 }))
                    let color =  this.color(i + 6,channel);
                    return {
                        label: d.meta.name + '-' + channel + '-FF',
                        pointHoverBorderColor: this.color(i + 6,channel),
                        xAxisID: 'time',
                        yAxisID: 'temperature',
                        pointRadius: 2,
                        pointHoverRadius: 6,
                        backgroundColor: color,
                        pointHoverBackgroundColor: color,
                        dataType: 'Fluid Fill',
                        data: xyData
                    }
                })
            ) : []

            return [
                ...currentData,
                ...fluidFillData,
                tempData,

            ]
        })
    }

    plot() {

        this.peak = new Chart($('#result-peak-chart'), {

            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Current',
                        xAxisID: 'voltage',
                        yAxisID: 'current',
                        fill: false,
                        pointRadius: 0,
                        showLine: true,
                        borderColor: 'blue',
                        borderWidth: 1,
                        data: [

                        ]
                    },
                    {
                        label: 'peakCurrent',
                        xAxisID: 'voltage',
                        yAxisID: 'current',
                        fill: false,
                        pointRadius: 0,
                        showLine: true,
                        borderColor: 'red',
                        borderWidth: 1.5,
                        data: [

                        ]
                    },
                    {
                        label: 'baseCurrent',
                        xAxisID: 'voltage',
                        yAxisID: 'current',
                        fill: false,
                        pointRadius: 0,
                        showLine: true,
                        borderColor: 'green',
                        borderWidth: 1,
                        data: [

                        ]
                    }
                ]
            },
            options: {
                responsive: true,
                hoverMode: 'line',
                legend: {
                    display: false,
                },
                title: {
                    display: true,
                    text: 'Peak Fit'
                },
                scales: {
                    xAxes: [
                        {
                            id: 'voltage',
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: 'Voltage / V',
                            }
                        }
                    ],
                    yAxes: [
                        {
                            id: 'current',
                            type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                            display: true,
                            position: 'left',
                            scaleLabel: {
                                display: true,
                                labelString: 'Current / uA',
                            }
                        },

                    ]
                }
            }

        });

        this.trace = new Chart($('#result-trace-chart'), {
            type: 'scatter',
            data: {
                datasets: [

                ]
            },
            options: {
                responsive: true,
                hoverMode: 'nearest',

                pointHoverBorderColor: 'blue',
                legend: {
                    display: true,
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Device Trace Results'
                },
                tooltips: {
                    backgroundColor: '#FFFFF0',
                    titleFontSize: 14,
                    titleFontColor: '#0066ff',
                    bodyFontColor: '#000',
                    bodyFontSize: 13,
                    displayColors: false,
                    callbacks: {
                        title: (tooltipItem, data) => (data.datasets[tooltipItem[0].datasetIndex].label),
                        label: (tooltipItem, data) => {

                            return ` Time : ${data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].x} min`
                        },
                        afterLabel: (tooltipItem, data) => {
                            return ` ${data.datasets[tooltipItem.datasetIndex].dataType} : ${data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y}`
                        }
                    }
                },
                onHover: (e, ae) => {
                    if (ae.length) {
                        $('html,body').css('cursor', 'pointer');
                        if (this.trace.data.datasets[ae[0]._datasetIndex].yAxisID == 'current') {
                            // console.log(ae[0]._datasetIndex,ae[0]._index);
                            let dataIndex = this.trace.data.datasets[ae[0]._datasetIndex].dataIndex
                            let channel = this.trace.data.datasets[ae[0]._datasetIndex].channel
                            this.updatePeak(dataIndex, channel, ae[0]._index)
                        }


                    } else {
                        $('html,body').css('cursor', 'default');
                    }
                },
                scales: {
                    xAxes: [
                        {
                            id: 'time',
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: 'Time / min',
                            }
                        }
                    ],
                    yAxes: [
                        {
                            id: 'current',
                            type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                            display: true,
                            position: 'left',
                            scaleLabel: {
                                display: true,
                                labelString: 'Current / uA',
                            }
                        },
                        {
                            id: 'temperature',
                            type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                            display: true,
                            position: 'right',
                            scaleLabel: {
                                display: true,
                                labelString: 'Temperature / °C',
                            },

                            // grid line settings
                            gridLines: {
                                drawOnChartArea: false, // only want the grid lines for one axis to show up
                            }
                        }

                    ]
                }
            }
        })


    }



}