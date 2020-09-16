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
        this.data = {time:[],rawdata:[],fit:[],temp:[]}
        this.picoRunning = false
        this.plot()
    }
    start() {
        // this.data = {time:[],rawdata:[],fit:[],temp:[]};
        if (!this.picoRunning) {
            this.picoRunning = true;
            this.data = {time:[],rawdata:[],fit:[],temp:[]};
            this.chart.data.datasets[0].data=[]
            this.chart.data.datasets[1].data=[]
            this.app.send({"action":"dataProcess.getIthData","i":this.data.time.length})
        } 
        
    }
 
    getData() {
        if (this.picoRunning) {
            this.app.send({"action":"dataProcess.getIthData","i":this.data.time.length})
        } else {
            this.data = {time:[],rawdata:[],fit:[],temp:[]}
            this.app.send({"action":"dataProcess.getIthData","i":0}) 
            this.picoRunning = true
            this.chart.data.datasets[0].data=[]
            this.chart.data.datasets[1].data=[]
        }
    }
    stop() {
        this.picoRunning = false
        clearTimeout(this.addDataTimeout)
    }
    addData(data) {
        let next = this.data.time.length;
        if (data.time.length) {
            _.forEach(data,(val,key)=>{this.data[key].push(val[0])})
            this.chart.data.datasets[0].data.push({x:data.time[0].toFixed(2),y:data.fit[0].pc.toFixed(2)})
            this.chart.data.datasets[1].data.push({x:data.time[0].toFixed(2),y:data.temp[0].toFixed(1)})
            this.chart.update()
            this.updatePeak(this.data.time.length-1)
            this.addDataTimeout = setTimeout(() => {
                this.app.send({"action":"dataProcess.getIthData","i":next+1})
            }, 100);
        } else {
            this.addDataTimeout = setTimeout(() => {
                this.app.send({"action":"dataProcess.getIthData","i":next})
            }, 4000);
        }
    }
    updatePeak(idx) {
        let rawdata = this.data.rawdata[idx]
        let fit = this.data.fit[idx]
        let time = this.data.time[idx]
        this.peak.options.title.text = `Peak Fit | ${time.toFixed(2)} min - ${fit.pc.toFixed(2)}uA`
        this.peak.data.datasets[0].data = _.zip(...rawdata).map(([x,y])=>({x,y}))
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
                    {label:'Current',
                    pointHoverBorderColor:'cyan',
                    xAxisID:'time',
                    yAxisID: 'current',
                    pointRadius: 2,
                    pointHoverRadius:6,
                    backgroundColor: 'red',
                    data:[
                        
                    ]},
                    {   label:'Temperature',
                     xAxisID:'time',
                    yAxisID: 'temp',
                    pointRadius: 2,
                    borderColor:'green',
                    backgroundColor: 'white',
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
                onHover: (e,ae)=>{
                    if (ae.length) {
                        $('html,body').css('cursor','pointer');
                        if (ae[0]._datasetIndex==0){
                            this.updatePeak(ae[0]._index)
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