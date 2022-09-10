#!/usr/bin/env ruby
require 'json'

res = []
Dir["../dbs/*.json"].each do |r|
    json = File.open(r) {|f| JSON.parse(f.read)}

    done = 0
    amount = 0
    name = r.split("/")[-1].gsub(".json", "")
    json.keys.each do |sp|
        json[sp].each do |ew|
            amount += 1
            done += 1 if ew["complete"]
        end
    end
    res << "|#{name}|#{done}/#{amount}|#{(done/amount*100).round(1)}%|"
end
puts "|name|status| % |"
puts "| -- | ---- | - |"
puts res.join("\n")