import $ from 'jquery';
export class InputDialog {
/* Create a input modal,dynamically load the fields form the given string

usage:
initiate the class by 

*/
    constructor (selectorString) {        
        this.modal = $(selectorString)
        this.modalTitle = $(selectorString+'-title')
        this.modalForm = $(selectorString+'-form')
        this.onConfirmCb = null;
        this.onCancelCb = null;
        this.modalForm.on('submit',e=>{
            e.preventDefault();
            if (this.onConfirmCb) {
                this.onConfirmCb(...this.modalForm.serializeArray().map(val=>val.value)); 
            }
            this.modal.modal('hide');
            this.resetDialog();     
        })
        $(selectorString+'-confirm').on('click',(e)=>{
            if (this.onConfirmCb) {
                this.onConfirmCb(...this.modalForm.serializeArray().map(val=>val.value)); 
            }
            this.resetDialog()
        });

        $(selectorString+'-cancel').on('click',(e)=>{
            if (this.onCancelCb) {
                this.onCancelCb(...this.modalForm.serializeArray().map(val=>val.value)); 
            }
            this.resetDialog()
        });


    }
    resetDialog(){
        this.onConfirmCb=null;
        this.onCancelCb=null;
        this.modalForm.html('<h4>You must call setFields() First.</h4>')
        this.modalTitle.text('Input Dialog')
    }

    setTitle(title){
        this.modalTitle.text(title);
        return this
    }

    setFields(...fields){        
        this.modalForm.html(fields.map(field=>
            `<div class="input-group input-group-sm mb-3">
                <div class="input-group-prepend">
                <span class="input-group-text">${field}</span>
                </div>
                <input type="text"  class="form-control"  name="${field}" >
            </div>
            `
        ).join(''))
        return this
    }

    onConfirm(callback){
        this.onConfirmCb = callback
        return this
    }

    onCancel(callback){
        this.onCancelCb = callback
        return this
    }
    show(){
        this.modal.modal('show')
        return this
    }
    
}