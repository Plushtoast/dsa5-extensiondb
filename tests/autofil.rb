require 'json'

dbPath = "./../dbs/"


dataAll = {}
Dir.entries(dbPath).each do |db|
    next if db == "." or db == ".."
    json = File.open("#{dbPath}#{db}") {|f| JSON.parse(f.read)}

    category = db.split(".")[0].split("_")[-1]

    dataAll[category] = {} unless dataAll[category]

    json.each do |spell, extensions|
        
        extensions.each do |ext|
            next if ext["dirty"] 

            dataAll[category][spell] = [] if dataAll[category][spell].nil?

            unless ext["dirty"]
                if dataAll[category][spell].find{|x| x["name"] == ext["name"]}
                    #compare

                else
                    dataAll[category][spell] << ext                
                end
            end
        end
    end
end

Dir.entries(dbPath).each do |db|
    next if db == "." or db == ".."
    json = File.open("#{dbPath}#{db}") {|f| JSON.parse(f.read)}

    write = false
    json.each do |spell, extensions|
        
        extensions.each do |ext|
            next unless ext["dirty"] 

            if dataAll[category][spell]
                write = true
                json[spell] = dataAll[category][spell]
            end
        end
    end

    if write
        File.open("#{dbPath}#{db}", "w") {|f| f.write(JSON.pretty_generate(json))}
    end
end

puts JSON.pretty_generate(dataAll)