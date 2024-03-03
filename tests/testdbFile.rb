#!/usr/bin/env ruby
require 'json'


targetCategories = ["Kulturschaffende", "Objekte", "Wesen", "Lebewesen", "Objekte (magische Objekte)", "Objekte (karmale Objekte)", "Tiere", "Übernatürliche Wesen", "Chimären", "Daimonide", "Elementare", "Untote"]

directory_name = "./log"
Dir.mkdir(directory_name) unless File.exists?(directory_name)

rollPattern = /^(\+|-)?\d{1,3}[wWdD]\d{1,3}((\+|-)(\d|QS))?(\*(\d|QS))?$/

Dir["../dbs/*.json"].each do |r|
    puts r
    json = File.open(r) {|f| JSON.parse(f.read)}

    fname = r.split("/")[-1].gsub(".json", "")
    
    output = []
    json.each do |spell, value|
        value.each do |ext|
            name = "#{spell} - #{ext["name"]}"
            ext["changes"].each do |change|
                key = change["key"]
                case key
                when "system.maintainCost.value"
                    output << "#{name}: #{key} <#{change["value"]}>  does not match pattern" unless change["value"] =~ /(^0$|^\d{1,3} (AsP|AE|KaP|KE) (pro|per) (\d{1,3} )?(Kampfrunde(n)?|KR(s)?|Minute(n)?|Sekunde(n)?|second(s)?|min|Stunde(n)?|Tag(e)?|combat round(s)?|CR(s)?|minute(s)?|min|hour(s)?|day(s)?))/
                

                when "system.variableBaseCost"
                when "system.canChangeCastingTime.value"
                    output << "#{name}: #{key} can only be true/false" unless change["value"] =~ /(true|false)/
                when "system.AsPCost.value", "defenseMalus", "system.castingTime.value", "decreaseCastingTime.mod", "reduceCostSpell.mod", "increaseRangeSpell.mod", "reduceCostSpell.mod", "system.target.width", "system.target.angle"
                    output << "#{name}: #{key} needs to be a number" unless change["value"].is_a? Numeric
                when "system.targetCategory.value"
                    cats = change["value"].split(",").map{|x| x.strip}.reject{|x| targetCategories.include?(x)}
                    output << "#{name}: #{key} unknown categorie(s) #{cats.join(", ")}" if cats.any?
                when "system.effectFormula.value"
                    output << "#{name}: #{key} <#{change["value"]}> does not match pattern #{rollPattern}" unless change["value"] =~ rollPattern || change["value"] =~ /\+(\d|QS)/

                    output << "#{name}: #{key} needs to start with + or -" if !(change["value"] =~ /^(\+|-)/) && change["mode"] == 2
                when "system.target.value"
                    output << "#{name}: #{key} <#{change["value"]}> does not match pattern" unless change["value"] =~ /(qs\*|ql\*)?\d{1,3}/
                when "system.range.value"
                    output << "#{name}: #{key} <#{change["value"]}> does not match pattern" unless change["value"] =~ /(selbst|berühren|\d{1,3} Schritt(e)?)/
                when "system.duration.value"
                    output << "#{name}: #{key} <#{change["value"]}> does not match pattern" unless change["value"] =~ /(\d{1,3}|QS) (Kampfrunde(n)?|KR(s)?|Sekunden(n)?|Minute(n)?|min|Stunde(n)?|Tag(e)?|Woche(n)?|Monat(e)?|Jahr(e)?)/
                when "macro.transform"
                    output << "#{name}: #{key} <#{change["value"]}> file missing" unless File.exists?("../macros/#{change["value"]}.js")
                when "extensionModifier.mod"
                    output << "#{name}: #{key} <#{change["value"]}> not a number or wrong mode" if !(change["value"].is_a?(Numeric) && change["mode"] == 2)
                when "system.target.type"
                    output << "#{name}: #{key} <#{change["value"]}> unknown area type" unless change["value"] =~ /(sphere|cone|line|cube)/
                when "system.target.value"
                    output << "#{name}: #{key} <#{change["value"]}> does not match pattern" unless change["value"] =~ /(qs\*|ql\*)?\d{1,3}/
                else

                    output << "#{name}: uncovered key <#{key}>"
                end
            end
        end
    end
    if output.any?
        File.open("./log/#{fname}.txt", "w") {|f| f.write(output.join("\n"))} 
    elsif File.exists?("./log/#{fname}.txt")
        File.delete("./log/#{fname}.txt")
    end

end
