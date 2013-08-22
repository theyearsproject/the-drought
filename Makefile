COMPARE = \
	js/weeks.js \
	components/underscore/underscore.js \
	components/d3/d3.js \
	components/jquery/jquery.js \
	components/jquery-ui/ui/jquery-ui.js \
	components/bootstrap/js/tooltip.js \
	components/bootstrap/js/modal.js



all: js/compare.js

clean:
	@rm -f js/compare.js

js/compare.js:
	cat $(COMPARE) | uglifyjs > $@