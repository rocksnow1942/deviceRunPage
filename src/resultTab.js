import {Chart} from "chart.js";
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
        this.fetchingNewData = false
    }
    initWebsocket() {
        this.ws = new WebSocket(websocketAddr)

        this.ws.onopen = e=>{
            this.requestData(0,this.perPage*2)
            // <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        }
        this.ws.onclose = e=>{

        }

        this.ws.onerror = e=>{

        }

        this.ws.onmessage = e=>{
            let packet = JSON.parse(e.data);
            let data = packet.data;
            let action = packet.action;
            if (packet.status === 'ok') {
                switch(action) {
                    case 'dataStore.getRecentPaginated':
                        this.refreshBtn.html('<i class="fas fa-sync"></i>')
                        // let oldlength = this.data.length;
                        let item = data.items;
                        this.data = _.unionBy(item,this.data,'_id') 
                        this.data.sort((a,b)=>{
                            let da = (new Date(a.meta.created)).getTime();
                            let db = (new Date(b.meta.created)).getTime();
                            return db - da
                        }) 
                        
                        if (!data.hasNext) {
                            this.allFetched = true
                        }
                        if (this.fetchingNewData) {
                            this.page=0
                            this.fetchingNewData = false
                        }
                        this.updatePage()
                        break 
                    case "dataStore.getDataFromIndex":
                        this.data = _.unionBy([data],this.data,'_id') 
                        this.data.sort((a,b)=>{
                            let da = (new Date(a.meta.created)).getTime();
                            let db = (new Date(b.meta.created)).getTime();
                            return db - da
                        }) 
                        this.updatePage()
                        break
                    default:
                        this.app.showToast(packet)
                        break
                }
            } else {
                this.app.showAlert(JSON.stringify(packet),'danger')
            }
        }

    }
    send (msg) {
        if (this.ws && this.ws.readyState==1) {
            this.ws.send(JSON.stringify(msg))
        }
    }

    requestData(page,perpage) {
        if (this.ws && this.ws.readyState==1) {
            this.refreshBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>')
            this.send({action:"dataStore.getRecentPaginated",page:page,"perpage":perpage,"pwd":""})
        } else {
            this.app.showAlert('Data WebSocket Not Connected.','warning')
            
        }
    }

    updatePage() {
        // update page
        let data = this.data.slice(this.page*this.perPage, (this.page+1)*this.perPage)
        let options = data.map((e,i)=>{
            let name = e.meta.name || e.meta.error; 
            let date = (new Date(e.meta.created)).toLocaleString();
            const sb = {F:"&#8457;",S:"&#x2713;",E:"&times;"}
            let upload = e.upload? sb[e.upload]+'&nearr;': "";
            return `<option value=${i}>${upload} ${name} - ${date} &nbsp;&nbsp;&nbsp;</option>`
        })
        this.resultSelect.html(options.join('')) 
        if ((this.page+1) * this.perPage>=this.data.length) {
            
            this.nextBtn.prop('disabled',true)
        } else {
            this.nextBtn.prop('disabled',false)
        } 
        if (this.page) {this.prevBtn.prop('disabled',false)} else {this.prevBtn.prop('disabled',true)}
        
    }
    fetchNew() {
        // this.fetchingNewDataPage += 1
        this.fetchingNewData = true
        this.allFetched = false 
        this.data = []
        // this.requestData(this.fetchingNewDataPage-1,1)
        this.requestData(0,this.perPage*2)
        
    }
    getCurrentSelection() {
        return this.resultSelect.val().map(e=>this.page*this.perPage + parseInt(e)) 
    }

    addEventListener () {
        this.nextBtn.click(e=>{
            this.page +=1;
            this.updatePage() 
            
            if (!this.allFetched && ((this.page+2) * this.perPage>this.data.length) ) {
                // need to fetch next page 
                this.requestData(this.page+1, this.perPage)
            }

        });
        this.prevBtn.click(e=>{
            this.page -=1;
            this.updatePage();
             
        })

        this.refreshBtn.click(e=>{
            this.fetchNew()
        })

        this.downloadBtn.click(e=>{
            window.open('/download')
        })

        this.resultSelect.change(e=>{
            let idx = this.getCurrentSelection()
            // update result meta idsplay 
            let fD = this.data[idx[0]];
            this.metaDisplay.html(`
            <li>Name : ${fD.meta.name}  </li>
            <li>Method : ${fD.meta.method}  </li>
            <li>deltaT : ${fD.meta.deltaT}  </li>
            <li>GoalTemp : ${fD.meta.temp}  </li>
            <li>Status : ${fD.status}  </li>
            <li>Result : ${fD.result}  </li>
            `)
            // update result inputs 
            this.nameInput.val(fD.meta.name)
            this.expInput.val(fD.meta.exp)
            this.descInput.val(fD.meta.desc)
            // update plot
            
            this.trace.data.datasets = this.getTraceDataset(idx)
            this.trace.update()

        })

        $('#result-save-btn').click(e=>{
            let idx = this.getCurrentSelection()
            let name = this.nameInput.val()
            let exp = this.expInput.val()
            let desc = this.descInput.val()
            idx.forEach((e,i,arr)=>{
                this.data[e].meta.name = arr.length==1 ? name: `${name}-${i}`;
                this.data[e].meta.exp = exp;
                this.data[e].meta.desc = desc;
                this.send({action:"dataStore.editMeta",index:this.data[e]._id,meta:this.data[e].meta})
            })
            if (idx.length) {this.updatePage()}

        })

        $('#result-upload-btn').click(e=>{
            let idx = this.getCurrentSelection();
            idx.forEach((e,i,arr)=>{
                let index = this.data[e]._id;
                this.send({action:'dataStore.uploadData',index:index}) 
                setTimeout(() => {
                    this.send({action:'dataStore.getDataFromIndex',index:index})
                }, 5000);
            })
        })
    }

    updatePeak(i,j) {
        let idx = this.trace.data.datasets[i].dataIndex
        let name = this.data[idx].meta.name
        let rawdata = this.data[idx].data.rawdata[j]
        let fit = this.data[idx].data.fit[j]
        let time = this.data[idx].data.time[j]
        if (rawdata && fit) {
            this.peak.options.title.text = [`${name}`,`${time.toFixed(2)} min - ${fit.pc.toFixed(2)}uA`]
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
    }

    color(i){
        const colors = [ 'red','GREEN','blue','DEEPPINK', 'CORAL','LIGHTSEAGREEN','AQUA', 'DEEPSKYBLUE','SLATEGRAY',
        'BLACK','SANDYBROWN']
        let id = i % colors.length
        return colors[id]
    }

    getTraceDataset(indexes) {
        return indexes.flatMap((e,i)=>{
            let d = this.data[e];
            let currentData = d.data? _.zip(d.data.time,d.data.fit).map(([t,fit])=>({x:t?t.toFixed(2):0,y:fit?fit.pc.toFixed(2):0})): []           
            let tempData = d.data? _.zip(d.data.time,d.data.temp).map(([t,temp])=>({x:t?t.toFixed(2):0,y:temp?temp.toFixed(2):0})): []           
            return [
                {  // this is the current data
                    label:d.meta.name,
                    pointHoverBorderColor:this.color(i+6),
                    xAxisID:'time',
                    yAxisID: 'current',
                    pointRadius: 2,
                    pointHoverRadius:6,
                    backgroundColor: this.color(i),
                    dataIndex:e,
                    data: currentData
            } , 
            { // this is the temperature data
                label:d.meta.name+'-T',
                pointHoverBorderColor:this.color(i),
                xAxisID:'time',
                yAxisID: 'temperature',
                pointRadius: 2,
                pointHoverRadius:6,
                backgroundColor: this.color(i+6),
                dataIndex:e,
                data: tempData
            }

            ]
        })
    }

    plot () {
        
        this.peak = new Chart($('#result-peak-chart'), {

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

        }) ;

        this.trace = new Chart( $('#result-trace-chart') , {
            type:'scatter',
            data:{ 
                datasets:[
                     
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
					text: 'Device Trace Results'
                },
                onHover: (e,ae)=>{
                    if (ae.length) {
                        $('html,body').css('cursor','pointer');
                        this.updatePeak(ae[0]._datasetIndex,ae[0]._index)
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
                            id: 'temperature',
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