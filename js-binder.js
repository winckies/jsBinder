// jsBinder 2.0.0
(function ( $ ) {
    // Pool request
    var executePool = new Array();

    // Current request
    var currentRequest = null;
    $.jsBinder = function(options) {

        var settings = $.extend({
            // Set debug to true if you want logs.
            debug: false,
            /*
             *  You can manage request execute behavior, here options:
             *  - "safe" for execute only one request at time, don't send another request if there is already one.
             *  - "force" for execute only one request at time but abort previous one it's running.
             *  - "sync" for execute all requests but one after the previous is done (synchrone).
             *  - "async" for execute all requests when they're called (asynchrone).
             *  Default: "safe"
             */
            executeBehavior: "safe",
            // jquery Events
            jqueryEvents: new Array('click', 'mouseover'),
            // Default callback format
            // html or json or other acceptable jquery dataType
            defaultCallbackFormat:'json',
            // Disable button before ajax call
            disableFormInputs:true,
            // Customize the 'jb' key
            jbKey:'jb'
        }, options );

        if(settings.debug) {
            console.log('---- jsBinder ----');
            console.log('Config: ExecuteType["' + settings.executeBehavior + '"]');
            console.log('Registred events: ' + settings.jqueryEvents);
        }

        // Register basic events
        jQuery(document).on('click', '*[' + settings.jbKey + '-link]:not([' + settings.jbKey + '-event]), [' + settings.jbKey + '-refresh]:not([' + settings.jbKey + '-event])', function() {
            call($(this));
        });

        jQuery(document).on('click', '*[' + settings.jbKey + '-func]:not([' + settings.jbKey + '-event]):not([' + settings.jbKey + '-link]):not([' + settings.jbKey + '-form])', function() {
            window[getVal($(this), 'func')]($(this));
        });

        // Register specified events
        for(var i = 0; i < settings.jqueryEvents.length; i++) {
            $('*[' + settings.jbKey + '-link][' + settings.jbKey + '-event="' + settings.jqueryEvents[i] + '"], *[' + settings.jbKey + '-refresh][' + settings.jbKey + '-event="' + settings.jqueryEvents[i] + '"]').bind(settings.jqueryEvents[i], function() {
                call($(this));
            });

            $('*[' + settings.jbKey + '-toggle][' + settings.jbKey + '-event="' + settings.jqueryEvents[i] + '"]').bind(settings.jqueryEvents[i], function() {
                toggle($(this));
            });

            $('*[' + settings.jbKey + '-func][' + settings.jbKey + '-event="' + settings.jqueryEvents[i] + '"]:not([' + settings.jbKey + '-link]):not([' + settings.jbKey + '-form])').bind(settings.jqueryEvents[i], function() {
                window[getVal($(this), 'func')]($(this));
            });
        }

        /*
         * Form submit handler
         */
        jQuery(document).on('click', '*[' + settings.jbKey + '-form]', function() {
            formCall($(this));
        });


        /*
        * Prepare execute
        */
        function prepareRequest(element, functionName) {

          // check for data-func
           if(getVal(element, 'func'))
             window[getVal(element, 'func')](element);

           var accepted = true;

           if (settings.executeBehavior === 'safe') {
               if (currentRequest !== null) {
                   if (settings.debug) console.log('-- Reject new request.');
                   accepted = false;
               }
           }

           if (settings.executeBehavior === 'force') {
               if (currentRequest !== null) {
                   if (settings.debug) console.log('-- Abord current request and start new one.');
                   currentRequest.abort();
               }
           }

           if (settings.executeBehavior === 'sync') {
               if(currentRequest !== null) {
                   if (settings.debug) console.log('-- Adding new request in queue : ' + element + '.');
                   executePool.push({
                       element: element,
                       functionName: functionName
                   });
                   accepted = false;
               }
           }

           if (settings.executeBehavior === 'async') {
               // nothing special to do.
           }

           if(accepted === true)
               if (settings.debug) console.log("<br/>");

           return accepted;
        }

        /**
        * end request
        */
        function endRequest() {
           // leave the request alone
           currentRequest = null;

           if(settings.executeBehavior === 'sync' && executePool.length > 0) {
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
            call($('*[' + settings.jbKey + '-refresh="' + name + '"]'));
        }

        /*
         * Toggle
         */
        function toggle(element) {
            $(element.attr(settings.jbKey + '-toggle')).toggle();
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
             callbackFormat = (settings.defaultCallbackFormat === 'html') ? null : settings.defaultCallbackFormat;

           if (settings.debug) console.log('Call "' + link + '" with method "' + method + '" and callbackFormat: ' + callbackFormat + '.');

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
             callbackFormat = (settings.defaultCallbackFormat === 'html') ? null : settings.defaultCallbackFormat;

           // Prepare form values for request
           var serializedData = form.serialize();
           serializedData += "&" + form.attr('name');

           // disable inputs
           if(settings.disableFormInputs) {
             var inputs = form.find("input, select, textarea");
             inputs.attr('disabled', 'disabled');
           }

           if (settings.debug) console.log('Form call "' + link + '" with method "' + method + '", callbackFormat: ' + callbackFormat + ', parameter(s): ' + serializedData);

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
               if(settings.disableFormInputs) {
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
            if (settings.debug) console.log('[' + jqXHR.status + '] Request done.');

            var wrapper = getVal(element, 'wrapper');
            if (wrapper) {
                if (settings.debug) console.log('Load response content in: ' + wrapper + '.');
                $(wrapper).html(data);
            }

            var callback = getVal(element, 'callback');
            if (callback) {
                if (settings.debug) console.log('Callback custom function: ' + callback + '.');
                window[callback](element, data, textStatus, jqXHR, null);
            }

            if(callback && !wrapper) {
                if (settings.debug) console.log('End (without specified behavior).');
            }
        }

        /*
        * Call when a request have faile
        */
        function failedRequest(element, jqXHR, textStatus, errorThrown) {
           // Don't manage abort request
           if(errorThrown === 'abort')
               return;

           if (settings.debug) console.log('[' + jqXHR.status + '] Request error: ' + textStatus + ' - ' + errorThrown);
           // Check for call back function
            var callback = getVal(element, 'callback');
           if (callback) {
               if (settings.debug) console.log('Callback custom function: "' + callback + '".');
               var data = null;
               window[callback](element, data, textStatus, jqXHR, errorThrown);
           }
        }

        function getVal(element, name) {
            return element.attr(settings.jbKey + '-' + name);
        }
        return this;
    };
}( jQuery ));