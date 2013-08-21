FILES = js/weeks.js \
    	components/underscore/underscore.js \
    	components/d3/d3.js \
    	components/jquery/jquery.js \
    	components/jquery-ui/ui/jquery-ui.js \
    	components/bootstrap/js/tooltip.js \
    	components/bootstrap/js/modal.js

all: js/drought.js

clean:
	rm js/drought.js

js/drought.js:
	cat $(FILES) | uglifyjs > js/drought.js