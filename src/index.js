import $ from 'jquery';
import _ from 'lodash';
import {RunChart} from './runChart'
import {ConfirmDialog} from './confirmDialog'
import {ResultTab} from './resultTab' 
import 'bootstrap'
import './app.scss';
import '@fortawesome/fontawesome-free/css/all.css';
import '@fortawesome/fontawesome-free/js/all.js';

/* 
Have to add following 
@import "../../../../bootstrap/scss/functions";
@import "../../../../bootstrap/scss/variables";
to 'bootstrap-switch/src/sass/bootstrap4/bootstrap-switch.scss'
to avoid import error.
*/
import 'bootstrap-switch/src/sass/bootstrap4/bootstrap-switch.scss'
import 'bootstrap-switch';



class App {
    constructor () {
        
        this.picoStatus = $('#pico-status')
        this.picoStatusTooltip = $('#picostatus-tooltip')
        this.temperature = $('#temperature')
        this.remainingTime = $('#remaining-time')
        this.uptime = $('#uptime') 
        this.reconnect = $('#connectBtn')
        this.method = $('#method')
        this.methodDisplay = $('#methodDisplay')
        this.picoDevModeToggle = $('#pico-devMode-toggle')
        this.picoDevModeToggle.bootstrapSwitch('size','small');
        
        
        this.initWebsocket()
        this.addEventListener()
        this.picoMethods = {}
        this.picoIsRunning = false
        this.intervalCallbacks = []
        this.confirmDialog = new ConfirmDialog()
        this.runChart = new RunChart(this)
        this.resultTab = new ResultTab(this)
    }
    send (msg) {
        if (this.ws && this.ws.readyState==1) {
            this.ws.send(JSON.stringify(msg))
            return true
        }
        return false
    }

    secondsToMinSec(time){
        let hour = Math.floor((time/3600)); 
        hour = hour ?  hour.toString()+':' : '';
        let min = Math.floor((time/60)%60).toString();
        min = '0'.repeat(Math.max(0,2-min.length)) + min
        let sec = Math.floor(time%60).toString()
        sec = '0'.repeat(Math.max(0,2-sec.length)) + sec
        return `${hour}${min}:${sec}`
    }

    initWebsocket() {
        this.ws = new WebSocket(websocketAddr)
        // ws events 
        this.ws.onopen = (e) => {
            this.reconnect.removeClass('btn-warning btn-danger').addClass('btn-success')
            this.reconnect.html('<i class="fas fa-wifi"></i> Connected')
            this.send({"action":"measurement.getPicoMethod"})
            this.getPicoStatus()
            this.getHeatingStatus()
            this.getUpTime()
            this.send({"action":"heating.getGoalTemp"})
            
        };
        this.ws.onclose =  (e) => {
            this.reconnect.removeClass('btn-success btn-danger').addClass('btn-warning')
            this.reconnect.html('<i class="fas fa-redo"></i> Reconnect')
            this.clearIntervalCallback()
            this.ws = null
        }
        this.ws.onerror = (e)=>{
            this.reconnect.removeClass('btn-success btn-warning').addClass('btn-danger')
            this.reconnect.html('<i class="fas fa-exclamation-circle"></i> Error')
            this.clearIntervalCallback()
            this.ws=null
        }
        this.ws.onmessage =  (e) => {
            let packet = JSON.parse(e.data);
            let data = packet.data;
            let action = packet.action;
            if (packet.status==='ok') {
                switch(action) {
                    case 'measurement.getPicoMethod':
                        for (let method in data) {
                            if (! (method in this.picoMethods)) {
                                this.method.append(`<option value=${method}>${method}</option>  `)
                            }
                            if (!_.isEqual(this.picoMethods[method],data[method])) {
                                this.picoMethods[method]=data[method]
                            }                          
                        }
                        break
                    
                    case 'measurement.getPicoStatus':
                        let time = this.secondsToMinSec(data.remainingTime);
                        let disp = {
                            idle:['&nbsp;&nbsp;Idle&nbsp;&nbsp;', time,'success',],
                            waiting:['&nbsp;Waiting&nbsp;',time,'warning'],
                            running:['&nbsp;Running&nbsp;',time,'warning'],
                            error:['&nbsp;Error&nbsp;',time,'danger'],
                            done:['&nbsp;Done&nbsp;',time,'warning'],
                            unknown:['&nbsp;Unknown&nbsp;',time,'danger'],
                        }[data.status];
                        this.picoStatus.html(disp[0])
                        this.picoStatus.removeClass().addClass(`badge badge-${disp[2]}`)
                        this.remainingTime.html(`${disp[1]}`)
                        this.remainingTime.removeClass().addClass(`badge badge-${disp[2]}`)
                        if (data.reason && data.reason!=this.picoStatusTooltip.attr('data-original-title')) {
                            this.picoStatusTooltip.attr('title',data.reason)
                            this.picoStatusTooltip.tooltip('dispose')
                            this.picoStatusTooltip.tooltip()
                            this.picoStatusTooltip.tooltip('show')
                            
                        } else if (!data.reason) {
                            this.picoStatusTooltip.attr('data-original-title',"")
                            this.picoStatusTooltip.tooltip('dispose')
                        }

                        if (data.status !== 'idle' && data.status!=='error') {
                            setTimeout(() => {
                                this.getPicoStatus()
                            }, 1000);
                            this.picoIsRunning = true
                            $('#start-button').text('STOP')
                            $('#start-button').removeClass('btn-outline-primary').addClass('btn-outline-danger')
                            this.runChart.start()
                        } else {
                            this.picoIsRunning = false
                            $('#start-button').text('START')
                            $('#start-button').removeClass('btn-outline-danger').addClass('btn-outline-primary')
                            this.runChart.stop()
                            setTimeout(() => {
                                this.getPicoStatus()
                            }, 3000);
                        }
                        break
                    case 'heating.getCurrentTemp':
                        this.temperature.html(data.toFixed(1)+' &#8451;')
                        break
                    case 'heating.getTempControllingTime':
                        data? this.temperature.removeClass('badge-secondary').addClass('badge-success'):
                        this.temperature.removeClass('badge-success').addClass('badge-secondary')
                        break
                    case 'heating.getGoalTemp':
                        $('.current-goal-temp').text(data.toFixed(2))
                        break 
                    case 'heating.stopTempControl':
                        this.showAlert('Heating stopped.','success',)
                        break
                    case 'heating.setGoalTemp':
                        $('.current-goal-temp').text(data.toFixed(2))
                        this.showAlert(`Start heating to <strong>${data} &#8451;</strong>.`,'success')
                        break
                    case 'main.getUpTime':
                        this.uptime.text(this.secondsToMinSec(data))
                        break
                    case 'dataProcess.getData':
                        this.runChart.addData(data)
                        break
                    case 'measurement.devMode':                        
                        this.picoDevModeToggle.bootstrapSwitch('state',data)                        
                        break
                    default:
                        this.showToast(packet)
                        break
                }
            } else {
                this.showAlert(JSON.stringify(packet),'danger')
                
            }
        }
    }

    clearIntervalCallback(){
        this.intervalCallbacks.forEach(i=>{clearInterval(i)})
        this.intervalCallbacks = []
    }

    showToast(packet) {
        let time = (new Date()).toLocaleString().split(',')[1].trim();
        let toast = `
        <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" >
        <div class="toast-header">
            <strong class="mr-auto">STATUS: ${packet.status.toUpperCase()}</strong>
            <small class="text-muted">${time}</small>
            <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="toast-body">
            Action: <strong>${packet.action}</strong><br>
            Data: ${JSON.stringify(packet.data).slice(0,300)+'...'}
        </div>
        </div>`
        $('#toast-msg').append(toast)
        $('.toast').toast({   
            autohide:false,
        })
        setTimeout(() => {
            $('#toast-msg .toast:first-child').fadeOut().remove()
        }, 5000);
        $('.toast').toast('show',)
    }

    getPicoStatus() {
        this.send({"action":"measurement.getPicoStatus"})
    }
    getUpTime() {
        this.intervalCallbacks.push ( setInterval(() => {
            console.log('get up time');
            this.send({"action":"main.getUpTime"})    
        }, 1000));
    }
    getHeatingStatus() {
        this.intervalCallbacks.push(setInterval(() => {
            this.send({"action":"heating.getCurrentTemp"});
            this.send({"action":"heating.getTempControllingTime"},);
        }, 3000));       
    }

    showAlert(msg,mode,timeout=2000) {
        let head = {danger:'error',}[mode] || mode
        let alert = `<div class="alert alert-${mode} alert-dismissible" role="alert" style='display:none'>
            <strong>${head.toUpperCase()} </strong>
            <span>${msg}</span>
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
        $('#alert').append(alert);
        let newElement = $('#alert .alert').last().slideDown()
        if (mode === 'success') {
            setTimeout(() => {
                newElement.slideUp()
                setTimeout(() => {
                   newElement.remove() 
                }, 500);
            }, timeout);
        } else {
            newElement.find('.close').on('click',e=>{
                newElement.slideUp();
                setTimeout(() => {
                    newElement.remove()
                }, 500);
                e.preventDefault();
                e.stopPropagation()})
        }
    }

    addEventListener () {
       
        this.picoDevModeToggle.bootstrapSwitch('onSwitchChange',(e,state)=>{
            // console.log($("[name='my-checkbox']").bootstrapSwitch('state'));
            this.send({action:'measurement.setDevMode',devMode:state})            
        });
       
        // reconnect button
        this.reconnect.on('click',e=>{
            if ( !this.ws || this.ws.readyState != 1) {
                this.initWebsocket()
                this.resultTab.initWebsocket()
            }
        })

        // method selectioin
        this.method.on('click',e=>{
            this.send({"action":"measurement.getPicoMethod"})
        })
        this.method.on('change',e=>{
            let method = this.method.val();
            if (method in this.picoMethods) {
                this.methodDisplay.html("")
                _.forEach(this.picoMethods[method],(settings,channel)=>{
                    this.methodDisplay.append(`<li><strong><u>Channel ${channel}</u></strong></li>`)
                    _.forEach(settings,(value,key)=>{
                        this.methodDisplay.append(`<li><b>${key}:</b> ${value}</li>`)
                    })
                })
                $('#selected-method').text(method)
            } else {
                this.methodDisplay.html("")
            }
        })

        // temp control 
        $('#temp-control-btn').on('click',e=>{
            $('#temp-dialog').modal('show')
        });
        // pico control 
        $('#pico-control-btn').on('click',e=>{
            
            $('#pico-dialog').modal('show');
            // have to send this message because the slider state cannot be set when modal is not shown.
            this.send({"action":"measurement.devMode"})
            
        })

        $('#start-temp-control').on('click',e=>{
            let goal = +$('#goal-temp').val();
            this.send({"action":"heating.setGoalTemp","temp":goal})
            this.send({"action":"heating.startTempControl"})
        });
        $('#stop-temp-control').on('click',e=>{
             
            this.confirmDialog.confirm('<h4>Are you sure to stop heating? </h4> ',()=>{
                this.send({"action":"heating.stopTempControl"})
            })
             
        })


        // start button 
        $('#start-button').on('click',e=>{
            if (this.picoIsRunning) {
                this.confirmDialog.confirm('<h4>Are you sure to stop?</h4>',()=>{
                    this.send( {"action":"measurement.stopPico"} )
                })
            } else {
                $('#meta-dialog').modal('show')
            }   
        }) 

        $('#start-test').on('click',e=>{
            let method = this.method.val();
            let temp =  +document.getElementsByClassName('current-goal-temp')[0].textContent;
            let deltaT= 5;
            let name = $('#test-name').val().trim()
            let exp = $('#test-exp').val()
            let desc = $('#test-desc').val()
            if (method in this.picoMethods) {
                if (name) {
                    // measurement meta info: {method, deltaT, temp, name, exp, desc}
                    this.send({
                        meta:{method,deltaT,temp,name,exp,desc},
                        method:method,
                        deltaT:5,
                        action:'measurement.startMeasure'
                    })
                    setTimeout(() => {
                        this.getPicoStatus()
                    }, 300);
                    this.showAlert('Started test.', 'success')
                } else {
                    this.showAlert('Name cannot be empty.', 'warning')
                }
            } else {
                this.showAlert(`Method "${method}" is not available.`, 'warning')
            }
        })
    }




    
}



let app = new App()
