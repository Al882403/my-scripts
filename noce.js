alert('working')

var UI = (function(){
    
    var EventManger = {};
    var __moduleModelAPI = {};
	
	var pageFinal=0
    
    function __init(){
        
        __registerWithApp();
    }
    
    function __registerWithApp(){
        app.registerUI({register:__register});
    }
    
    function __register(api){
        EventManger = api.eventsManager;
        __moduleModelAPI = api.moduleModelAPI;
        
        __registerEvents();  
    }
    
    function __registerEvents(){
        EventManger.registerForEvent(ModuleEvents.MODULE_MODEL_READY, __onModuleModelReady);
        EventManger.registerForEvent(ModuleEvents.CONTENT_MODEL_READY, __onContentModelReady);
        
        /* Register for Events that update the UI */
        EventManger.registerForEvent(NavigationEvents.PAGE_LOAD_END, __onPageLoadComplete);
        EventManger.registerForEvent(NavigationEvents.PAGE_LOAD_START, __onPageLoadStart);
        EventManger.registerForEvent(NavigationEvents.PAGE_COMPLETED, __onPageComplete);
        EventManger.registerForEvent(NavigationEvents.CHAPTER_LOAD_START, __onChapterLoadStart);
        
    }
    
    function __loadUI(){
        $(".ui-container").load(__moduleModelAPI.modulePaths.ui, function(){
            
            EventManger.trigger(UIEvents.UI_LOADED);
            __initialiseUIElements();
        });
    }
    
    
    //Event handlers
    function __onModuleModelReady(){
       //Nothing to do?
        
    }
    
    function __onContentModelReady(){
        console.log("loading ui html")
        __loadUI();
    }
    
    function __onPageLoadStart(e){
        $(".ui-container").addClass("disabled");
        
        $.magnificPopup.close();

        //Halt any audio playing
        EventManger.trigger(MediaEvents.PAUSE_OST_AUDIO);
		
		$('.toc ol').scrollTop($('.toc  li:nth-child('+(pageFinal-1)+')').position().top);
    }
    
    function __onPageLoadComplete(e){
        
        var pageModel = e.data.pageModel;
        var pageXML = e.data.xml;
        var pageId = pageModel.pageId
        var chapterId = pageModel.chapterId;
        
        /*Update TOC links status*/
        $(".ui-container").removeClass("disabled");
		
        
        //remove active state from prev active page
        //$(".toc ul li.active").removeClass("active");
        
        //Remove notstarted status and make current page link active
        //$(".toc ul li").eq(pageId).removeClass("notstarted");
        
        var chapterId = pageModel.chapterId;
        
        var currentChapterModel = __moduleModelAPI.getChapterModel(chapterId);
        if(pageId!=0){
            
            $(".page-heading h1").attr("tabindex","0").focus();
        }else{
                $(".title.accessible").attr("tabindex","0").focus();
        }
        console.log("PageLoaded: "+chapterId+" "+pageId)
		pageFinal=pageId
		
        setTimeout(function(){__updateTOC(currentChapterModel);$(".toc ol li").eq(pageId).addClass("active");},500) 
       
        __updatePagination(pageModel);
        
        __updatePageTitle(pageModel);
        
        __updateNarrationBox(pageXML);
        
        __updateNavigationState(pageModel);
		
		$("div.mejs-button.mejs-volume-button").attr("tabindex","-1");
		
		$('.toc ol').scrollTop($('.toc  li:nth-child('+(pageFinal-1)+')').position().top);

    }
    
    function __onPageComplete(e){
        console.log(e)
        var pageModel = e.data.pageModel;
         $(".pagination .next").removeClass("locked");
    }
    
    function __setPagination(chapterModel){
        
        var pages = chapterModel.getPages();
        
        console.log("set pagination"+pages.length)
        var pageCountTotal = pages.length;
        $(".page-numbers .total-pages").text(pageCountTotal);
        
        $(".page-numbers .current-page-number").text("1");
        
        
    }
    
    function __updatePagination(pageModel){
        $(".page-numbers .current-page-number").text(pageModel.pageId + 1);
        
       
        var chapterModel = __moduleModelAPI.getChapterModel(pageModel.chapterId);
        var pages = chapterModel.getPages();
        
        var pageCountTotal = pages.length;
        
        $(".page-numbers").attr("aria-label","Table of Contents  Page "+(pageModel.pageId + 1)+" of "+pageCountTotal+"");
        $(".page-numbers").attr("title","Table of Contents  Page "+(pageModel.pageId + 1)+" of "+pageCountTotal+"");
        
        if((pageModel.pageId +  1) < pageCountTotal ){
            $(".pagination .next").addClass("active");
        }else{
           $(".pagination .next").removeClass("active");
           $(".pagination .previous").attr("aria-label","Disabled previous");
        }
        
        if(1 < (pageModel.pageId +  1)){
            $(".pagination .previous").addClass("active");
        }else{
           $(".pagination .previous").removeClass("active");
           $(".pagination .previous").attr("aria-label","Disabled previous"); 
        }

        if($(".pagination .next").hasClass("locked") || !$(this).hasClass("active") || $(".ui-container").hasClass("disabled")){
            console.log("Navigation locked. Can't move forward.");
            $(".pagination .next").attr("aria-label","Disabled next");
        }else{
            $(".pagination .next").attr("aria-label","Activated next");
        }

        if(!$(".pagination .previous").hasClass("locked") || $(this).hasClass("active")){
               $(".pagination .previous").attr("aria-label","Activated previous");
           }
    }
    
    var lockinTimer = -1;
    function __updateNavigationState(pageModel){
        clearInterval(lockinTimer);
        var lockEnabled =  __moduleModelAPI.getSetting("slidelock").attr("enabled") == "true";
        var lockTime =  parseInt(__moduleModelAPI.getSetting("slidelock").attr("time"));
        
        if(pageModel.pageStatus!="completed"){
            //lock next
            if(lockEnabled){
                console.log("LOCK TIMER ACTIVATED")
                 $(".pagination .next").addClass("locked");
                 $(".pagination .next").attr("aria-label","Disabled next");
                

                function onTimeOut(){
                    console.log("LOCK TIMER DONE")
                    clearInterval(lockinTimer);
                    EventManger.trigger(UIEvents.LOCK_TIMEDOUT,{pageModel:pageModel});

                    if(!pageModel.isLocked){
                        $(".pagination .next").removeClass("locked");
                        $(".pagination .next").attr("aria-label","Activated next");
                    }
                }
                lockinTimer = setInterval(onTimeOut,lockTime);
            }else{
                EventManger.trigger(UIEvents.LOCK_TIMEDOUT,{pageModel:pageModel});
                 if(!pageModel.isLocked){
                        $(".pagination .next").removeClass("locked");
                        $(".pagination .next").attr("aria-label","Activated next");
                }
            }
        }else{
            $(".pagination .next").removeClass("locked");
        }
        
        $(".pagination .previous").removeClass("locked");
        
    }
	
	function isHTML(str) {
    var a = document.createElement('div');
    a.innerHTML = str;
    for (var c = a.childNodes, i = c.length; i--; ) {
        if (c[i].nodeType == 1) return true; 
    }
    return false;
}
    
    function __updatePageTitle(pageModel){
	if(isHTML(pageModel.pageTitle))
	$(".main header h1").html(pageModel.pageTitle);
	else
        $(".main header h1").text(pageModel.pageTitle);
    }
    
    function __updateNarrationBox(pageXML){
        var narrationText = pageXML.find("narration").text();
        if(narrationText){
            $(".captions .captions-text").html(narrationText)
        }
        $(".captions .captions-text").scrollTop(0);
    }

    function __onChapterLoadStart(e){
        var chapterIndex = e.data;
        var chapterModel = __moduleModelAPI.getChapterModel(chapterIndex);
        
        __updateTOC(chapterModel);
        
        __setPagination(chapterModel);
    }
    
   
    function __updateTOC(chapterModel){
       
        var pages = chapterModel.getPages();
        
        var tocStr = ""
        for(var i=0; i<pages.length; i++){
            var pageObj =  chapterModel.getPageByIndex(i);
            var linkId = chapterModel.chapterId + "_" + pageObj.pageId
            
            var lockEnabled =  __moduleModelAPI.getSetting("slidelock").attr("enabled") == "true";
            
            var linkStatus = pageObj.pageStatus;
            if(!lockEnabled){
                linkStatus = "completed";
            }
            tocStr += "<li  id=\""+linkId+"\" class=\"item "+linkStatus+"\"><a tabindex=\"-1\" href=\"\">" +pageObj.pageTitle +"</a></li>";
        }
        
        $(".toc ol").html(tocStr);
        $(".toc ol li a").click(function(){
            var linkId = $(this).parent().attr("id");
            var chapterId = linkId.split("_")[0];
            var pageId = linkId.split("_")[1];
            pageFinal=pageId
            var pageModel = __moduleModelAPI.getChapterModel(chapterId).getPageByIndex(pageId);
            if(pageModel &&  pageModel.pageStatus != "notstarted" || !lockEnabled)
            {            
                EventManger.trigger(NavigationEvents.PAGE_LOAD_REQUEST, {chapterId:chapterId, pageId:pageId});
            
                $(".toc").removeClass("open");
                $(".footer-container").removeClass("inactive");
            }else{
                alert("This page is unavailable until you have viewed previous pages.");
            }
            	
            return false;
        })
    }
    
    
    
    //init
    __init();
    
    $(document).focus(function(e){
        console.log("focus-->",e)
    })
    
    //TO-DO
    //Break UI elements into components
    
    function __initialiseUIElements(){
    
        /*Set Module Title */
        
        $(".header-container .title .inner").html(__moduleModelAPI.data.moduleTitle);
        
        
        /*Setup navigation Events */

        // Magnific Pop Up - Modals
        // Documentation - http://dimsemenov.com/plugins/magnific-popup/documentation.html
        // Initialization code
        /*$('.modal-image').magnificPopup({
          type: 'image'
          // other options
        });*/
        
        $(".pagination .next").on("click touch",function(){
           
           if($(this).hasClass("locked") || !$(this).hasClass("active") || $(".ui-container").hasClass("disabled")){
               console.log("Navigation locked. Can't move forward.");
               return false;
           }else{
               $(this).addClass("locked");
           }
           $(this).blur();
           
           EventManger.trigger(UIEvents.NEXT_PAGE);
           
           return false;
        })
        
        $(".pagination .previous").on("click touch",function(){
           
           if($(this).hasClass("locked") || !$(this).hasClass("active")|| $(".ui-container").hasClass("disabled")){
               console.log("Navigation locked. Can't move back.");
               return false;
           }else{
               $(this).addClass("locked")
           }
           
           $(this).blur();
           
           EventManger.trigger(UIEvents.PREVIOUS_PAGE);
           
           return false;
        })

        $(".pagination .next").on("focus",function(){
           
           if($(this).hasClass("locked") || !$(this).hasClass("active") || $(".ui-container").hasClass("disabled")){
               console.log("Navigation locked. Can't move forward.");
                $(".pagination .next").attr("aria-label","Deactivated next");
           }else{
               $(".pagination .next").attr("aria-label","Activated next");
           }
        })
        
        $(".pagination .previous").on("focus",function(){
           
           if($(this).hasClass("locked") || !$(this).hasClass("active")|| $(".ui-container").hasClass("disabled")){
               console.log("Navigation locked. Can't move back.");
               $(".pagination .previous").attr("aria-label","Deactivated previous");
           }else{
               $(".pagination .previous").attr("aria-label","Activated previous");
           }
       })
        $(".pagination .next").on("keydown",function(e){
           console.log("key on next")
           if(e.which == 9){
               console.log("keypress for next");
          $(".title.accessible").focus();
               e.preventDefault();
           }
           if(e.which == 9 && e.shiftKey){
          $(".page-numbers").focus();
               e.preventDefault();
           }
       });

        /*$('.popup-with-form').magnificPopup({
          type: 'inline',
          preloader: false,
          focus: '#name',
          // When elemened is focused, some mobile browsers in some cases zoom in
          // We disabled it:
          callbacks: {
            open: function() {
                if($(window).width() < 700) {
                    this.st.focus = false;
                } else {
                    this.st.focus = '#name';
                }
                
                EventManger.trigger(UIEvents.NOTES_OPEN);
                
            },
            close: function(){
                EventManger.trigger(UIEvents.NOTES_CLOSE);
            }
              
          },
          mainClass:"note-popup"
        });*/
        $('.popup-with-form').click(function(){
            $.magnificPopup.close();
            
            function f(){
                var evtObj ={exit:".mfp-close", elements:".notes-accessible", parent:".white-popup-block"};
                $.magnificPopup.open({
                    type: 'inline',
                    items: {src: $("#notes-form")},
                    callbacks: {
                        open: function() {
							      $("body").css("overflow","hidden"); console.log("css hidden fixed");
									$(".ui-container").css("position","fixed"); $("html").css("position","fixed");$("html").css("width","100%");; 			  
                            if($(window).width() < 700) {
                                this.st.focus = false;
                            } else {
                                this.st.focus = '#name';
                            }
                            EventManger.trigger(UIEvents.NOTES_OPEN);
                            EventManger.trigger(ComplianceEvents.INIT_FOCUS_LIST, evtObj);
                        },
                        close: function(){
							$("body").css("overflow","")
							$(".ui-container").css("position","absolute");	$("html").css("position","absolute");$("html").css("width","100%");	console.log("css auto absolute");					 
                            EventManger.trigger(UIEvents.NOTES_CLOSE);
                        }

                    },
                    mainClass:"note-popup"                  
                });
            }
            
            setTimeout(f, 50);
        })
        

        // Open the menu when you click the bars 
        $(".nav-toggle").click(function(){
            $.magnificPopup.close();
            $(".menu").addClass("open");
            $(".footer-container").addClass("inactive");
			$("body").css("overflow","hidden"); console.log("css hidden fixed");
			$(".ui-container").css("position","fixed"); $("html").css("position","fixed");$("html").css("width","100%");; 	
            EventManger.trigger(UIEvents.MENU_TOGGLE)
            return false;
        });
        
        $(".nav-toggle .menu-btn").on("keydown",function(e){
            if(e.which == 13 || e.which == 32){
                $(".nav-toggle").click();
                e.preventDefault();
                console.log("Menu keypress")
            }
        });

        // Close the menu when you click the X
        $(".menu .close").click(function(){
            $(".menu").removeClass("open");
            EventManger.trigger(UIEvents.MENU_TOGGLE);
            $(".footer-container").removeClass("inactive");
            $(".accessible.menu-btn").focus();
			$("body").css("overflow","")
			$(".ui-container").css("position","absolute"); 	console.log("css auto absolute");		
            return false;
        });
        
        //close the menu on keypress
         $(".menu .close").on("keydown",function(e){
            if(e.which == 13 || e.which == 32){
				$("body").css("overflow","")
			$(".ui-container").css("position","absolute"); 	console.log("css auto absolute");		
                $(".menu .close").click();
                e.preventDefault();
            }
             
        });


        // Close the menu when you click anywhere outside of the Menu
        $(document).on('click', function(event) {
          if (!$(event.target).closest('.menu').length) {
              $(".menu").removeClass("open");
              $(".toc").removeClass("open");
              $(".footer-container").removeClass("inactive");
              $(".accessible-menu li a").attr("tabindex","-1");
			  $("body").css("overflow","")
			$(".ui-container").css("position","absolute");	$("html").css("position","absolute");$("html").css("width","100%");	console.log("css auto absolute");				
          }
        });
        



        // Open the table of contents when you click the bars 
        $(".page-numbers").click(function(){
            //$(".toc").slideToggle('slow'); 
            $(".toc").addClass("open");
            $(".footer-container").addClass("inactive");
            
            EventManger.trigger(UIEvents.TOC_OPEN);
             
            return false;
        });
        
        $(".page-numbers").on("keydown",function(e){
            if(e.which == 13 || e.which == 32){
                $(".page-numbers").click(); 
                e.preventDefault();
            }
        });
        
        // Method for calling menu using keyboard
         EventManger.registerForEvent(UIEvents.MENU_TOGGLE, __onMenuToggle)
        function __onMenuToggle()
        {
            console.log("Menu open event listened.")
             if($(".menu").hasClass("open")){
                var eventObj ={exit:".menu .close", elements:".menu ul li a"}; 
               
                $(".menu ul li a").attr("tabindex","0");
                 //EventManger.trigger(ComplianceEvents.INIT_FOCUS_LIST, eventObj);
             }else{
                 $(".menu ul li a").attr("tabindex","-1");
             }
            
            return false;
        }
        EventManger.registerForEvent(UIEvents.TOC_OPEN, __onTOCOpen)
        function __onTOCOpen()
        {
            console.log("TOC open...")
            //$(".accessible-menu li a").attr("tabindex","0");
            $(".accessible-menu li").filter(".notstarted").find("a").attr("tabindex","-1");
            $(".accessible-menu li").filter(".notstarted.active, .completed").find("a").attr("tabindex","0");
            //var evtObj ={exit:".close-toc", elements:".accessible-menu li a[tabindex=\"0\"]"}; setTimeout(function(){EventManger.trigger(ComplianceEvents.INIT_FOCUS_LIST,evtObj);},500);

            var evtObj ={exit:".close-toc", elements:".accessible-menu li"}; setTimeout(function(){EventManger.trigger(ComplianceEvents.INIT_FOCUS_LIST,evtObj);},500);            
        }

        // Close the menu when you click the X
        $(".close-toc").click(function(){
            //$(".toc").slideToggle('fast');
            $(".toc").removeClass("open");
            $(".footer-container").removeClass("inactive");
            
            $(".accessible-menu li a").attr("tabindex","-1"); 
            setTimeout(function(){$("#next").focus();},100);
            
            return false;
        });
        
        $(".close-toc").on("keydown",function(e){
            if(e.which == 13 || e.which == 32){
                $(".close-toc").click();
                console.log("close toc keypress");
            }
            
            setTimeout(function(){$(".page-numbers").focus();},100);
            
        
            return false;
        });
        /*Initialise Glossary*/
        $(".menu-link#menu-glossary-link").magnificPopup({
            type: 'ajax',
            callbacks:{
                ajaxContentAdded:function(){
                    console.log("glossary open");
                    var evtObj ={exit:".mfp-close", elements:".glossary-heading .menu-item[tabindex=\"0\"]", parent:".glossary"};
                    $(".mfp-content").addClass("glossary-popup large");
                    EventManger.trigger(UIEvents.GLOSSARY_OPEN);
					$("body").css("overflow","hidden"); console.log("css hidden fixed");;
					$(".ui-container").css("position","fixed"); $("html").css("position","fixed");$("html").css("width","100%");; 				
                    EventManger.trigger(ComplianceEvents.INIT_FOCUS_LIST, evtObj);
                },
                close:function(){
                    EventManger.trigger(UIEvents.GLOSSARY_CLOSED)
					$("body").css("overflow",""); console.log("css auto absolute");;
					$(".ui-container").css("position","absolute");
                }
            }
        });
        
        /*Initialise Help*/
        $(".menu-link#menu-help-link").magnificPopup({
            type: 'ajax',
            callbacks:{
                ajaxContentAdded:function(){
                    console.log("help open");
                    $(".mfp-content").addClass("help-popup contentpopup-container large");
                    EventManger.trigger(UIEvents.HELP_OPEN);
					$("body").css("overflow","hidden"); console.log("css hidden fixed");;
				$(".ui-container").css("position","fixed"); $("html").css("position","fixed");$("html").css("width","100%");; 					
                    var eventObj ={exit:".mfp-close", elements:".helpContainer .help-item-description", parent:".mfp-content.help-popup"};
                    EventManger.trigger(ComplianceEvents.INIT_FOCUS_LIST, eventObj);
                },
                close:function(){
                    EventManger.trigger(UIEvents.HELP_CLOSE);
					$("body").css("overflow",""); console.log("css auto absolute");;
				$(".ui-container").css("position","absolute");	$("html").css("position","absolute");$("html").css("width","100%");	console.log("css auto absolute");			
                }
            }
        });
        
        /*Initialise Credits*/
        $(".menu-link#menu-credits-link").magnificPopup({
            type: 'ajax',
            callbacks:{
                ajaxContentAdded:function(){
                    console.log("credits open");
                    $(".mfp-content").addClass("credits-popup medium");
                    EventManger.trigger(UIEvents.CREDITS_OPEN);
					$("body").css("overflow","hidden"); console.log("css hidden fixed");;
				$(".ui-container").css("position","fixed"); $("html").css("position","fixed");$("html").css("width","100%");; 	
                },
                close:function(){
                    EventManger.trigger(UIEvents.CREDITS_CLOSE);
					$("body").css("overflow",""); console.log("css auto absolute");;
				$(".ui-container").css("position","absolute");
                }
            }
        });
        
        /*Initialise Credits*/
        $(".menu-link#menu-references-link").magnificPopup({
            type: 'ajax',
            callbacks:{
                ajaxContentAdded:function(){
                    console.log("references open");
                    $(".mfp-content").addClass("references-popup medium");
                    //EventManger.trigger(UIEvents.REFERENCES_OPEN);
                },
                close:function(){
                   // EventManger.trigger(UIEvents.REFERENCES_CLOSE);
                }
            }
        });
        
        /*Initialise Notes*/
        $(".menu-link#menu-notes-link").magnificPopup({
            type: 'ajax',
            callbacks:{
                ajaxContentAdded:function(){
                    console.log("notes menu open");
                    $(".mfp-content").addClass("notes-popup");
                    EventManger.trigger(UIEvents.NOTES_MENU_OPEN);
					$("body").css("overflow","hidden"); console.log("css hidden fixed");;
				$(".ui-container").css("position","fixed"); $("html").css("position","fixed");$("html").css("width","100%");; 						
                }
            }
        });

        $('.footer-container').delay(0).fadeIn(500);        
        

        // Mediaelement js - Audio/Video player
        MediaElementPlayer.prototype.buildcc = function(player, controls, layers, media) {
            var
                // create the CC button
            cc =
            $('<div class="mejs-button mejs-captions-button ' + ((player.options.cc) ? 'mejs-cc-on' : 'mejs-cc-off') + '">' +
                '<button type="button" aria-controls="mep_0" title="Captions" aria-label="CC">CC</button>' +
            '</div>')
            // append it to the toolbar
            .appendTo(controls)
            // add a click toggle event
            .click(function() {
               console.log("player.options.cc",player.options.cc)
               player.options.cc = !player.options.cc;
               if (player.options.cc) {
				   $('.main-container').css('padding-bottom','200px');
				   window.scrollTo(0, $('.main-container').height());
                   cc.removeClass('mejs-cc-off').addClass('mejs-cc-on');
                   $(".captions").addClass("open");
                   $(".close.close-captions").attr("tabindex","0");
                   $(".captions-text").attr("tabindex","0");
               } else {
                   cc.removeClass('mejs-cc-on').addClass('mejs-cc-off');
                   $(".captions").removeClass("open");
                   $(".close.close-captions").attr("tabindex","-1");
                   $(".captions-text").attr("tabindex","-1");
					$('.main-container').css('padding-bottom','90px');				   
				    window.scrollTo(0,0);
               }
            });
            $(".close-captions").click(function(){
                player.options.cc = false;
                cc.removeClass('mejs-cc-on').addClass('mejs-cc-off');
                $(".captions").removeClass("open");
                $(".close.close-captions").attr("tabindex","-1");
                $(".captions-text").attr("tabindex","-1");
                cc.find("button").focus();
            })
            $(".close-captions").on("keydown",function(e){
                //console.log("keydown",e)
                if(e.which == 13 || e.which == 32){
                    $(".close.close-captions").click();
					console.log("captions close keypress");
					
                    e.preventDefault();
                }
                
                
            });
        }
        
        // Documentation - http://mediaelementjs.com/
        // $('video, audio').mediaelementplayer();
        console.log("init audio")
        var ostAudioElement = new MediaElementPlayer('#ost_audio',{
            // if the <video width> is not specified, this is the default
            defaultVideoWidth: 480,
            // if the <video height> is not specified, this is the default
            defaultVideoHeight: 270,
            // if set, overrides <video width>
            videoWidth: -1,
            // if set, overrides <video height>
            videoHeight: -1,
            // width of audio player
            audioWidth: 400,
            // height of audio player
            audioHeight: 30,
            // initial volume when the player starts
            startVolume: 0.8,
            // useful for <audio> player loops
            loop: false,
            // enables Flash and Silverlight to resize to content size
            enableAutosize: true,
            // the order of controls you want on the control bar (and other plugins below)
            features: ['playpause','current','progress','duration','tracks','volume','fullscreen','cc','speed'],
            // Hide controls when playing and mouse is not over the video
            alwaysShowControls: false,
            // force iPad's native controls
            iPadUseNativeControls: false,
            // force iPhone's native controls
            iPhoneUseNativeControls: false, 
            // force Android's native controls
            AndroidUseNativeControls: false,
            // forces the hour marker (##:00:00)
            alwaysShowHours: false,
            // show framecount in timecode (##:00:00:00)
            showTimecodeFrameCount: false,
            // used when showTimecodeFrameCount is set to true
            framesPerSecond: 25,
            // turns keyboard support on and off for this instance
            enableKeyboard: true,
            // when this player starts, it will pause other players
            pauseOtherPlayers: true,
            // array of keyboard commands
            keyActions: []

        });
        window.player = ostAudioElement;
        function __onPlayOSTAudio(e){
            ostAudioElement.controls.removeClass("disabled");
            
			try{
				ostAudioElement.setCurrentTime(0);
            }catch(er1){}
			try{
				ostAudioElement.pause();
            }catch(er2){}
			
            setTimeout(function(){
                var audioPath = e.data.path;
                var type = e.data.type;
                var globalMediaType =  __moduleModelAPI.getSetting("media").attr("type");
                var globalOverride =  __moduleModelAPI.getSetting("media").attr("override");


                if(globalOverride == "true" || type == undefined || type == ""){
                    type = globalMediaType;
                    console.log("GLOBALTYPE:"+type)
                }

                if(type == "remote"){
                    audioPath = __moduleModelAPI.modulePaths.media + audioPath;
                }else{

                    audioPath =  __moduleModelAPI.modulePaths.base +__moduleModelAPI.modulePaths.lmedia + audioPath;
                }
                console.log("PLAY AUDIO: "+audioPath)
                ostAudioElement.setSrc(audioPath);
                ostAudioElement.play();
            },500);

            //$("input[id='mep_0-speed-1.00']:radio").prop("checked", true).trigger("click"); //reset the audio speed on page change

            var speedVal = $(".mejs-speed-button").find("button").html().slice(0, -1);

            $("input[id='mep_0-speed-" + speedVal + "']:radio").prop("checked", true).trigger("click");
        }
        
        function __onStopOSTAudio(e){
            console.log("STOPAUDIO");
            
            ostAudioElement.pause();
            setTimeout(function(){
                ostAudioElement.setSrc("common/audio/blank.mp3");
                ostAudioElement.controls.addClass("disabled");
            },500);
        }
        
        function __onPauseOSTAudio(e){
            console.log("PAUSE");
            
            ostAudioElement.pause();
        }
        
        EventManger.registerForEvent(MediaEvents.PLAY_OST_AUDIO, __onPlayOSTAudio);
        EventManger.registerForEvent(MediaEvents.STOP_OST_AUDIO, __onStopOSTAudio);
        EventManger.registerForEvent(MediaEvents.PAUSE_OST_AUDIO, __onPauseOSTAudio);
        

        // Added this to allow the icon clicked to close the modal. Magnific popoup was having a hard time with the HTML inside of the "closeMarkup" call in the original script. 

        (function (mfp, PREVENT_CLOSE_CLASS) {

        $.magnificPopup.proto._checkIfClose = function(target) {

            if($(target).closest('.' + PREVENT_CLOSE_CLASS).length) {
                return;
            }

            var closeOnContent = mfp.st.closeOnContentClick;
            var closeOnBg = mfp.st.closeOnBgClick;

            if(closeOnContent && closeOnBg) {
                return true;
            } else {

                // We close the popup if click is on close button or on preloader. Or if there is no content.
                if(!mfp.content || $(target).closest('.mfp-close , .note-action-access , .note-action-delete').length || (mfp.preloader && target === mfp.preloader[0]) ) {
                    return true;
                }

                // if click is outside the content
                if( (target !== mfp.content[0] && !$.contains(mfp.content[0], target)) ) {
                    if(closeOnBg) {
                        // last check, if the clicked element is in DOM, (in case it's removed onclick)
                        if( $.contains(document, target) ) {
                            return true;
                        }
                    }
                } else if(closeOnContent) {
                    return true;
                }

            }
            return false;
        };

        })($.magnificPopup.instance, 'mfp-prevent-close');
        
        /* Notes */
        
    }
    
    
})();









