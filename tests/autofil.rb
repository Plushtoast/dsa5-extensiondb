require 'json'

dbPath = "./../dbs/"


prettyprint = false
if prettyprint
    Dir.entries(dbPath).each do |db|
        next if db == "." or db == ".."
        json = File.open("#{dbPath}#{db}") {|f| JSON.parse(f.read)}

        File.open("#{dbPath}#{db}", "w") {|f| f.write(JSON.pretty_generate(json))}
    end
    return
end


dataAll = {}
Dir.entries(dbPath).each do |db|
    next if db == "." or db == ".."
    json = File.open("#{dbPath}#{db}") {|f| JSON.parse(f.read)}

    category = db.split(".")[0].split("_")[-1]

    dataAll[category] = {} unless dataAll[category]

    json.each do |spell, extensions|
        
        extensions.each do |ext|
            next if ext["dirty"] || ext["deprecated"]

            dataAll[category][spell] = [] if dataAll[category][spell].nil?

            
            if dataAll[category][spell].find{|x| x["name"] == ext["name"]}
                #compare

            else
                dataAll[category][spell] << ext                
            end
            
        end
    end
end

Dir.entries(dbPath).each do |db|
    next if db == "." or db == ".."
    json = File.open("#{dbPath}#{db}") {|f| JSON.parse(f.read)}

    category = db.split(".")[0].split("_")[-1]

    write = false

    dataAll[category].each do |spell, extensions|

        unless json[spell].nil?
            
            extensions.each do |ext|
                index = json[spell].index{|x| x["name"] == ext["name"]}

                if index.nil?
                    throw "Error: #{category} - #{spell} - #{ext["name"]} not found in #{db}"
                
                elsif json[spell][index]["dirty"]
                    json[spell][index] = ext
                end
            end
        end
    end
    
    File.open("#{dbPath}#{db}", "w") {|f| f.write(JSON.pretty_generate(json))} if write    
end

puts "Done"