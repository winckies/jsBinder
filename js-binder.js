// jsBinder v1.1

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

// Default callback format
// html or json or other acceptable jquery dataType
var defaultCallbackFormat = 'json';

// Disable button before ajax call
var disableFormInputs = true;

// Customize the 'jb' key
var jbKey = 'jb';

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
    jQuery(document).on('click', '*[' + jbKey + '-link]:not([' + jbKey + '-event]), [' + jbKey + '-refresh]:not([' + jbKey + '-event])', function() {
        call($(this));
    });

    jQuery(document).on('click', '*[' + jbKey + '-func]:not([' + jbKey + '-event]):not([' + jbKey + '-link]):not([' + jbKey + '-form])', function() {
        window[getVal($(this), 'func')]($(this));
    });

    // Register specified events
    for(var i = 0; i < jqueryEvents.length; i++) {
        $('*[' + jbKey + '-link][' + jbKey + '-event="' + jqueryEvents[i] + '"], *[' + jbKey + '-refresh][' + jbKey + '-event="' + jqueryEvents[i] + '"]').bind(jqueryEvents[i], function() {
            call($(this));
        });

        $('*[' + jbKey + '-toggle][' + jbKey + '-event="' + jqueryEvents[i] + '"]').bind(jqueryEvents[i], function() {
            toggle($(this));
        });

        $('*[' + jbKey + '-func][' + jbKey + '-event="' + jqueryEvents[i] + '"]:not([' + jbKey + '-link]):not([' + jbKey + '-form])').bind(jqueryEvents[i], function() {
            window[getVal($(this), 'func')]($(this));
        });
    }

    /*
     * Form submit handler
     */
    jQuery(document).on('click', '*[' + jbKey + '-form]', function() {
        formCall($(this));
    });

});

/*
* Prepare execute
*/
function prepareRequest(element, functionName) {

  // check for data-func
   if(getVal(element, 'func'))
     window[getVal(element, 'func')](element);

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
    call($('*[' + jbKey + '-refresh="' + name + '"]'));
}

/*
 * Toggle
 */
function toggle(element) {
    $(element.attr(jbKey + '-toggle')).toggle();
}

/*
* Basic call behavior
*/
function call(element) {

   if (!prepareRequest(element, 'call'))
       return;

   // Get link
   var link = getVal(element, 'link');
   // Get method
   var method = (getVal(element, 'method')) ? getVal(element, 'method') : 'get';
   // Get data format
   var callbackFormat = (getVal(element, 'format')) ? getVal(element, 'format') : null;
   if(callbackFormat === null)
     callbackFormat = (defaultCallbackFormat === 'html') ? null : defaultCallbackFormat;

   if (DEBUG) console.log('Call "' + link + '" with method "' + method + '" and callbackFormat: ' + callbackFormat + '.');

   // call ajax
   manageRequest($.ajax({
       url: link,
       type: method,
       datatype: callbackFormat
   }), element);
}

/*
* form call behavior
*/
function formCall(element) {

   if (!prepareRequest(element, 'formCall'))
       return;

   // Get form
   var form = (getVal(element, 'form').length > 0) ? element.parents('form') : $('form[name="' + getVal(element, 'form') + '"]');
   // Get link
   var link = (getVal(element, 'link')) ? getVal(element, 'link') : form.attr('action');
   // Get method
   var method = (getVal(element, 'method')) ? getVal(element, 'method') : form.attr('method');
   // Get data format
   var callbackFormat = (getVal(element, 'format')) ? getVal(element, 'format') : null;
   if(callbackFormat === null)
     callbackFormat = (defaultCallbackFormat === 'html') ? null : defaultCallbackFormat;

   // Prepare form values for request
   var serializedData = form.serialize();
   serializedData += "&" + form.attr('name');

   // disable inputs
   if(disableFormInputs) {
     var inputs = form.find("input, select, textarea");
     inputs.attr('disabled', 'disabled');
   }

   if (DEBUG) console.log('Form call "' + link + '" with method "' + method + '", callbackFormat: ' + callbackFormat + ', parameter(s): ' + serializedData);

   // ajax request
   manageRequest($.ajax({
       url: link,
       type: method,
       datatype: callbackFormat,
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

   if (getVal(element, 'wrapper')) {
       if (DEBUG) console.log('Load response content in: ' + getVal(element, 'wrapper') + '.');
       $(wrapper).html(data);
   }

   if (getVal(element, 'callback')) {
       if (DEBUG) console.log('Callback custom function: ' + getVal(element, 'callback') + '.');
       window[getVal(element, 'callback')](element, data, textStatus, jqXHR, null);
   }

   if(!getVal(element, 'callback') && !getVal(element, 'wrapper')) {
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
   if (getVal(element, 'callback')) {
       if (DEBUG) console.log('Callback custom function: "' + getVal(element, 'callback') + '".');
       var data = null;
       window[getVal(element, 'callback')](element, data, textStatus, jqXHR, errorThrown);
   }
}

function getVal(element, name) {
    return element.attr(jbKey + '-' + name);
}