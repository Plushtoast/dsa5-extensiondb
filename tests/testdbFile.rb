#!/usr/bin/env ruby
require 'json'


targetCategories = ["Kulturschaffende", "Objekte", "Lebewesen"]

directory_name = "./log"
Dir.mkdir(directory_name) unless File.exists?(directory_name)

Dir["../dbs/*.json"].each do |r|
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
                    output << "#{name}: #{key} can only be true/false" unless change["value"] =~ /(true|false)/
                when "system.AsPCost.value", "defenseMalus"
                    output << "#{name}: #{key} needs to be a number" unless change["value"].is_a? Numeric
                when "system.targetCategory.value"
                    cats = change["value"].split(",").map{|x| x.strip}.reject{|x| targetCategories.include?(x)}
                    output << "#{name}: #{key} unknown categorie(s) #{cats.join(", ")}" if cats.any?
                when "system.effectFormula.value"
                    output << "#{name}: #{key} needs to start with + or -" unless change["value"] =~ /^(\+-)/ || change["mode"] == 5
                when "system.target.value"
                    output << "#{name}: #{key} <#{change["value"]}> does not match pattern" unless change["value"] =~ /(qs\*|ql\*)?\d{1,3}/
                when "system.range.value"
                    output << "#{name}: #{key} <#{change["value"]}> does not match pattern" unless change["value"] =~ /(Berührung|\d{1,3} Schritt(e)?)/
                when "system.duration.value"
                    output << "#{name}: #{key} <#{change["value"]}> does not match pattern" unless change["value"] =~ /(\d{1,3}|QS) (Kampfrunde(n)?|KR(s)?|Sekunden(n)?|Minute(n)?|min|Stunde(n)?|Tag(e)?)/
                when "macro.transform"
                    output << "#{name}: #{key} <#{change["value"]}> file missing" unless File.exists?("../macros/#{change["value"]}.js")
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
