#!/usr/bin/env ruby
require 'json'

res = []
all = 0.0
alldone = 0.0
halfdone = 0.0
Dir["../dbs/*.json"].each do |r|
    json = File.open(r) {|f| JSON.parse(f.read)}

    done = 0.0
    amount = 0.0
    name = r.split("/")[-1].gsub(".json", "")
    json.keys.each do |sp|
        json[sp].each do |ew|
            next if json["deprecated"]

            amount += 1
            done += 1 if ew["complete"]
            halfdone += 1 if ew["complete"] || ew["changes"].any?
        end
    end
    res << "|#{name}|#{done.to_i}/#{amount.to_i}|#{(done/amount*100).round(1)}|"
    all += amount
    alldone += done
end
puts "|name|status| % |"
puts "| -- | ---- | - |"
puts res.join("\n")
puts "|partly done|#{halfdone.to_i}/#{all.to_i}|#{(halfdone/all*100).round(1)}|"
puts "|progress|#{alldone.to_i}/#{all.to_i}|#{(alldone/all*100).round(1)}|"