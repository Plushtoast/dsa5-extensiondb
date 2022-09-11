#!/usr/bin/env ruby
require 'json'

res = []
all = 0.0
alldone = 0.0
Dir["../dbs/*.json"].each do |r|
    json = File.open(r) {|f| JSON.parse(f.read)}

    done = 0.0
    amount = 0.0
    name = r.split("/")[-1].gsub(".json", "")
    json.keys.each do |sp|
        json[sp].each do |ew|
            amount += 1
            done += 1 if ew["complete"]
        end
    end
    res << "|#{name}|#{done.to_i}/#{amount.to_i}|#{(done/amount*100).round(1)}|"
    all += amount
    alldone += done
end
puts "|name|status| % |"
puts "| -- | ---- | - |"
puts res.join("\n")
puts "|sum|#{alldone.to_i}/#{all.to_i}|#{(alldone/all*100).round(1)}|"