import $ from 'jquery';
export class ConfirmDialog {
    constructor () {
        this.modal = $('#confirm-dialog')
        this.modalText = $('#confirm-dialog-text')
        this.cb = null
        $('#confirm-dialog-confirm').on('click',(e)=>{
            if (this.cb) {this.cb(); this.cb=null}
        })
        this.modal.on('hidden.bs.modal',()=>{
            this.cb=null
        })
    }
    confirm(msg,cb) {
        this.modalText.html(msg)
        this.cb = cb
        this.modal.modal('show')
    }
}