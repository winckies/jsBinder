// jsBinder v1.0

// Set DEBUG to true if you want logs.
var DEBUG = false;

/*
 *  You can manage request execute behavior, here options:
 *  - "safe" for execute only one request at time, don't send another request if there is already one.
 *  - "force" for execute only one request at time but abort previous one it's running.
 *  - "sync" for execute all requests but one after the previous is done (synchrone).
 *  - "async" for execute all requests when they're called (asynchrone).
 *  Default: "safe"
 */
var executeBehavior = "safe";

// jquery Events
var jqueryEvents = Array('click', 'mouseover');

// Default data type
// html or json or other acceptable jquery data type
var defaultDataType = 'json';

// Disable button before ajax call
var disableFormInputs = true;


// -----------------------------------------------------------------------------
// Pool request
var executePool = Array();

// Current request
var currentRequest = null;

$(document).ready(function() {
    
    if(DEBUG) {
        console.log('---- jsBinder ----');
        console.log('Config: ExecuteType["' + executeBehavior + '"]');
        console.log('Registred events: ' + jqueryEvents);
    }
    
    // Register basic events
    jQuery(document).on('click', '*[data-link]:not([data-event]), [data-refresh]:not([data-event])', function() {
        call($(this));
    });
    
    jQuery(document).on('click', '*[data-func]:not([data-event]):not([data-link]):not([data-form])', function() {
        window[$(this).data('func')]($(this));
    });
   
    // Register specified events
    for(var i = 0; i < jqueryEvents.length; i++) {
        $('*[data-link][data-event="' + jqueryEvents[i] + '"], *[data-refresh][data-event="' + jqueryEvents[i] + '"]').bind(jqueryEvents[i], function() {
            call($(this));
        });
        $('*[data-func][data-event="' + jqueryEvents[i] + '"]:not([data-link]):not([data-form])').bind(jqueryEvents[i], function() {
            window[$(this).data('func')]($(this));
        });
    }

    /*
     * Form submit handler
     */
    jQuery(document).on('click', '*[data-form]', function() {
        formCall($(this));
    });

});

/*
* Prepare execute
*/
function prepareRequest(element, functionName) {
  
  // check for data-func
   if(element.data('func'))
     window[element.data('func')](element);

   var accepted = true;

   if (executeBehavior === 'safe') {
       if (currentRequest !== null) {
           if (DEBUG) console.log('-- Reject new request.');
           accepted = false;
       }
   }

   if (executeBehavior === 'force') {
       if (currentRequest !== null) {
           if (DEBUG) console.log('-- Abord current request and start new one.');
           currentRequest.abort();
       }
   }

   if (executeBehavior === 'sync') {
       if(currentRequest !== null) {
           if (DEBUG) console.log('-- Adding new request in queue : ' + element + '.');
           executePool.push({
               element: element,
               functionName: functionName
           });
           accepted = false;
       }
   }

   if (executeBehavior === 'async') {
       // nothing special to do.
   }

   if(accepted === true)
       if (DEBUG) console.log("<br/>");

   return accepted;
}

/**
* end request
*/
function endRequest() {
   // leave the request alone
   currentRequest = null;

   if(executeBehavior === 'sync' && executePool.length > 0) {
       // Remove previous element
       executePool.shift();
       // start next request if exists
       if(executePool.length > 0) {
           if(executePool[0].functionName === 'call')
               call(executePool[0].element);
           else if(executePool[0].functionName === 'callForm')
               callForm(executePool[0].element);
       }
   }
}

/*
 * Refresh behavior
 */
function refresh(name) {
    call($('*[data-refresh="' + name + '"]'));
}

/*
* Basic call behavior
*/
function call(element) {

   if (!prepareRequest(element, 'call'))
       return;

   // Get link
   var link = element.data('link');
   // Get method
   var method = (element.data('method')) ? element.data('method') : 'get';
   // Get data type
   var dataType = (element.data('type')) ? element.data('type') : null;
   if(dataType === null)
     dataType = (defaultDataType === 'html') ? null : defaultDataType;

   if (DEBUG) console.log('Call "' + link + '" with method "' + method + '" and dataType: ' + dataType + '.');

   // call ajax
   manageRequest($.ajax({
       url: link,
       type: method,
       datatype: dataType
   }), element);
}

/*
* form call behavior
*/
function formCall(element) {

   if (!prepareRequest(element, 'formCall'))
       return;

   // Get form
   var form = (element.data('form').length > 0) ? element.parents('form') : $('form[name="' + element.data('form') + '"]');
   // Get link
   var link = (form.data('link')) ? form.data('link') : form.attr('action');
   // Get method
   var method = (form.data('method')) ? form.data('method') : form.attr('method');
   // Get data type
   var dataType = (element.data('type')) ? element.data('type') : null;
   if(dataType === null)
     dataType = (defaultDataType === 'html') ? null : defaultDataType;

   // Prepare form values for request
   var serializedData = form.serialize();
   serializedData += "&" + form.attr('name');
   
   // disable inputs
   if(disableFormInputs) {
     var inputs = form.find("input, select, textarea");
     inputs.attr('disabled', 'disabled');
   }

   if (DEBUG) console.log('Form call "' + link + '" with method "' + method + '" and dataType: ' + dataType + ' and parameter: ' + serializedData);

   // ajax request
   manageRequest($.ajax({
       url: link,
       type: method,
       datatype: dataType,
       data: serializedData
   }), element);
}


/*
* Manage request result 
*/
function manageRequest(request, element) {
   currentRequest = request;

   currentRequest.done(function(data, textStatus, jqXHR) {
       doneRequest(element, data, textStatus, jqXHR);
   });

   currentRequest.fail(function(jqXHR, textStatus, errorThrown) {
       failedRequest(element, jqXHR, textStatus, errorThrown);
   });

   currentRequest.always(function() {
       endRequest();
       // disable inputs
       if(disableFormInputs) {
         var form = element.parents('form');
         if(form) {
           var inputs = form.find("input, select, textarea");
           inputs.removeAttr('disabled');
         }
       }
   });
}

/*
* Call when a define ajax request is done
*/
function doneRequest(element, data, textStatus, jqXHR) {
   if (DEBUG) console.log('[' + jqXHR.status + '] Request done.');

   if (element.data('wrapper')) {
       if (DEBUG) console.log('Load response content in: ' + element.data('wrapper') + '.');
       $(wrapper).html(data);
   }

   if (element.data('callback')) {
       if (DEBUG) console.log('Callback custom function: ' + element.data('callback') + '.');
       window[element.data('callback')](element, data, textStatus, jqXHR, null);
   }

   if(!element.data('callback') && !element.data('wrapper')) {
       if (DEBUG) console.log('End (without specified behavior).');
   }
}

/*
* Call when a request have faile
*/
function failedRequest(element, jqXHR, textStatus, errorThrown) {
   // Don't manage abort request
   if(errorThrown === 'abort')
       return;

   if (DEBUG) console.log('[' + jqXHR.status + '] Request error: ' + textStatus + ' - ' + errorThrown);
   // Check for call back function
   if (element.data('callback')) {
       if (DEBUG) console.log('Callback custom function: "' + element.data('callback') + '".');
       var data = null;
       window[element.data('callback')](element, data, textStatus, jqXHR, errorThrown);
   }
}
