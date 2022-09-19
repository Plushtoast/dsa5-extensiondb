#!/usr/bin/env ruby
require 'json'


directory_name = "./log"
Dir.mkdir(directory_name) unless File.exists?(directory_name)

bookA = "goetterwirken"
bookB = "goetterwirken2"

cats = %w[ceremony liturgy]

cats.each do |cat|
    jsonA = File.open("./../dbs/#{bookA}_#{cat}.json") {|f| JSON.parse(f.read)}
    jsonB = File.open("./../dbs/#{bookB}_#{cat}.json") {|f| JSON.parse(f.read)}

    duplicates = jsonA.keys & jsonB.keys

    if duplicates.any?
        
    end
    if duplicates.any?
        File.open("./log/duplicates_#{bookA}_#{bookB}_#{cat}","w") {|f| f.write(duplicates.join("\n"))}
    elsif File.exists?("./log/duplicates_#{bookA}_#{bookB}_#{cat}")
        File.delete("./log/duplicates_#{bookA}_#{bookB}_#{cat}")
    end
end