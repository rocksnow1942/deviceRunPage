import {Chart} from "chart.js";
import $ from 'jquery';
import _ from 'lodash';

// TODO 
// update peak when new data is appended. 

export class RunChart {
    constructor(app) {
        this.traceChart = $('#trace-chart')
        this.peakChart = $('#peak-chart')
        this.app = app
        this.data = {}
        this.picoRunning = false
        this.plot()
    }

    dataLength () {
        // return field length of all data
        return {
            scan: this.data.scan ? _.mapValues(this.data.scan,(data)=>(data.time?data.time.length:0)) :{},
            temperature: this.data.temperature? (this.data.temperature.time?this.data.temperature.time.length:0):0,
            fluidFill: this.data.fluidFill? (_.mapValues(this.data.fluidFill,(data)=>(data.time?data.time.length:0)) ) :{}
        }
    }

    start() {
        // this.data = {time:[],rawdata:[],fit:[],temp:[]};
        if (!this.picoRunning) {
            this.picoRunning = true;
            this.data = {};
            this.chart.data.datasets.splice(1,this.chart.data.datasets.length-1);
            this.chart.data.datasets[0].data=[];
            this.chart.update()
            this.app.send({"action":"dataProcess.getData","dataLengthDict": this.dataLength()})
        } 
        
    }
 
    stop() {
        this.picoRunning = false
        clearTimeout(this.addDataTimeout)
    }
    
    getChannelScanColor(channel){
        const colors = [ 'red','GREEN','blue','BLACK','DEEPPINK',]
        return colors[ channel.slice(1) % colors.length ]
    }
    getChannelFluidFillColor(channel){
        const colors = [ 'SANDYBROWN', 'LIGHTSEAGREEN','DEEPSKYBLUE','SLATEGRAY','CORAL', ]
        return colors[ channel.slice(1) % colors.length ]
    }

    addData(data) {
        if (this.picoRunning ) {
        // merge the incoming data with this.data 
        _.mergeWith(this.data, data, (objValue,srcValue,)=>{
            if (_.isArray(objValue)) return objValue.concat(srcValue)
        })

        
        // update temperature
        if (data.temperature.time){
            //DEMO: scale data
            let tempData = _.zip(data.temperature.time,data.temperature.data).map(([t,temp])=>({x:t.toFixed(2)/scaleRatio,y:temp.toFixed(1)}))
            this.chart.data.datasets[0].data.push(...tempData)
        }
        
        // update scan graph
        _.forEach(data.scan,(data,channel)=>{
            let dataset = _.find(this.chart.data.datasets,o=>o.label===channel)
            //DEMO: scale data
            let xyData = _.zip(data.time,data.fit).map(([t,fit])=>({x:t.toFixed(2) / scaleRatio ,y:fit.pc.toFixed(2)}))
            
            if (dataset){
                dataset.data.push(...xyData)
            } else {
                this.chart.data.datasets.push({
                    label:channel,
                    xAxisID:'time',
                    yAxisID: 'current',
                    pointRadius: 2,
                    pointHoverRadius:6,
                    backgroundColor: this.getChannelScanColor(channel),
                    dataType:'Current',
                    data:xyData,
                })
            }
            // if new data is appended to this channel, update this peak.
            if (xyData.length>0){
                // update peak
                this.updatePeak(channel, this.data.scan[channel].time.length-1)
            }
        })

    
        // // update fluidFill
        _.forEach(data.fluidFill,(data,channel)=>{
            let dataset = _.find(this.chart.data.datasets,o=>o.label===channel+'-FF')
            //DEMO: scale data
            let xyData = _.zip(data.time,data.data).map(([t,d])=>({x:t.toFixed(2)/scaleRatio,y:d.toFixed(2)}))
            if (dataset){
                dataset.data.push(...xyData)
            } else {
                this.chart.data.datasets.push({
                    label:channel+'-FF',
                    xAxisID:'time',
                    yAxisID: 'temp',
                    pointRadius: 2,
                    borderColor:this.getChannelFluidFillColor(channel),
                    backgroundColor: 'white',
                    dataType:'Fluid Fill',
                    data:xyData,
                })
            }
        })
        
        
        // update chart.
        
        this.chart.update()
    
        // fetch data after 4000 ms.
        
            this.addDataTimeout = setTimeout(() => {
                this.app.send({"action":"dataProcess.getData","dataLengthDict": this.dataLength()})
            }, 4000);
        }
    }

    updatePeak(channel,idx) {
        let rawdata = this.data.scan[channel].rawdata[idx]
        let fit = this.data.scan[channel].fit[idx]
        let time = this.data.scan[channel].time[idx]
        this.peak.options.title.text = `Peak ${channel} - ${time.toFixed(2)}min - ${fit.pc.toFixed(2)}uA`;
        let step = (rawdata[0][1]-rawdata[0][0])/(rawdata[0][2]-1);
        let voltage = Array.from({length:rawdata[0][2]},(_,k)=>(rawdata[0][0] + k*step ))
        this.peak.data.datasets[0].data = _.zip(voltage,rawdata[1]).map(([x,y])=>({x,y}))
        let pv = fit.pv;
        let pc = fit.pc;
        let k = (fit.fy[1]-fit.fy[0])/(fit.fx[1]-fit.fx[0])
        let b = - k * fit.fx[1] + fit.fy[1]
        let bp = k * pv + b
        this.peak.data.datasets[1].data = [{x:pv,y:bp},{x:pv,y:bp+pc}]
        this.peak.data.datasets[2].data = _.zip(fit.fx,fit.fy).map(([x,y])=>({x,y}))//[{x:fit.fx[0],y:fit.fy[0]},{x:fit.fx[0],y:fit.fy[0]}]
        this.peak.update()
    }
    plot() {
        this.peak = new Chart(this.peakChart,{
            type:'scatter',
            data:{ 
                datasets:[
                    {label:'Current',
                    xAxisID:'voltage',
                    yAxisID: 'current',
                    fill:false,
                    pointRadius: 0,
                    showLine: true,
                    borderColor: 'blue',
                    borderWidth: 1,
                    data:[
                         
                    ]},
                    {label:'peakCurrent',
                    xAxisID:'voltage',
                    yAxisID: 'current',
                    fill:false,
                    pointRadius: 0,
                    showLine: true,
                    borderColor: 'red',
                    borderWidth: 1.5,
                    data:[
                       
                    ]},
                    {label:'baseCurrent',
                    xAxisID:'voltage',
                    yAxisID: 'current',
                    fill:false,
                    pointRadius: 0,
                    showLine: true,
                    borderColor: 'green',
                    borderWidth: 1,
                    data:[
                        
                    ]}
                ]
            },
            options: {
                responsive: true,
				hoverMode: 'line',
				legend: {
                    display:false,
                },
				title: {
					display: true,
					text: 'Peak Fit'
                },
				scales: {
                    xAxes:[
                        {
                            id:'voltage',
                            display:true,
                            scaleLabel: {
                                display:true,
                                labelString:'Voltage / V',
                            }
                        }
                    ],
					 yAxes:[
                         {
                             id: 'current',
                            type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                            display: true,
                            position: 'left',
                            scaleLabel: {
                                display:true,
                                labelString:'Current / uA',
                            }
                        },
                         
                     ] 
				}
            }

        });


        this.chart = new Chart(this.traceChart,{
            type:'scatter',
            data:{ 
                datasets:[
                    {label:'Temperature',
                     xAxisID:'time',
                    yAxisID: 'temp',
                    pointRadius: 2,
                    borderColor:'FUCHSIA',
                    backgroundColor: 'LIGHTCYAN',
                    dataType:'Temperature',
                    data:[
                    ]}
                    
                ]
            },
            options: {
                responsive: true,
                hoverMode: 'nearest',
               
                pointHoverBorderColor:'blue',
				legend: {
                    display:true,
                    position: 'bottom',
                },
				title: {
					display: true,
					text: 'Pico Trace'
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
                onHover: (e,ae)=>{
                    if (ae.length) {
                        $('html,body').css('cursor','pointer');
                        if (this.chart.data.datasets[ae[0]._datasetIndex].yAxisID=='current'  ){
                            let channel = this.chart.data.datasets[ae[0]._datasetIndex].label;
                            let index = ae[0]._index
                            
                            this.updatePeak(channel,index)
                        }
                    } else {
                        $('html,body').css('cursor','default');
                    }
                },
				scales: {
                    xAxes:[
                        {
                            id:'time',
                            display:true,
                            scaleLabel: {
                                display:true,
                                labelString:'Time / min',
                            }
                        }
                    ],
					 yAxes:[
                         {
                             id: 'current',
                            type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                            display: true,
                            position: 'left',
                            scaleLabel: {
                                display:true,
                                labelString:'Current / uA',
                            }
                        },
                        {   
                            id: 'temp',
                            type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                            display: true,
                            position: 'right',
                            scaleLabel: {
                                display:true,
                                labelString:'Temperature / °C',
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