$(document).ready(function(){
    var options = {
        debug: true
    };
    $.jsBinder(options);
});

var console = {
    panel: $(document.getElementById('log')).append('<div>'),
    log: function(m) {
        this.panel.append('<div>' +  m + '</div>');
        $("#log").scrollTop($("#log").height());
        $('#log').scrollTop($('#log')[0].scrollHeight);
    }
};

function userCallback(element, data, textStatus, jqXHR, errorThrown) {
    console.log('[USER SCRIPT] Callback function !');
}

function userFunc(element) {
  console.log('[USER SCRIPT] call function !');
}

function clear() {
  $('#log').html('');
}

function updateLogger() {
  $('#logger').css('top', $(window).scrollTop() + 20);
}

updateLogger();

$(window).scroll(function(){
  updateLogger();
});