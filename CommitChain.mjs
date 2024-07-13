import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

class commitchain {
  constructor(repoPath = ".") {
    this.repoPath = path.join(repoPath, ".commitchain");
    this.objectPath = path.join(this.repoPath, "objects"); // .commitchain/objects - for hashing store
    this.headPath = path.join(this.repoPath, "Head"); //      .commitchain/head
    this.indexPath = path.join(this.repoPath, "index"); //      .commitchain/index
    this.init();
  }

  async init() {
    await fs.mkdir(this.objectPath, { recursive: true }); // this will create object path recursive true means inside commit chain folder
    try {
      await fs.writeFile(this.headPath, "", { flag: "wx" }); //wx - open for writing , fails if file exits (write execulse)

      await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: "wx" });
    } catch (error) {
      console.log("Already intialised the .commitchain folder");
    }
  }

  //this function return hash of the object we are passing through the function using sha1 algorithm
  hashObject(content) {
    return crypto.createHash("sha1").update(content, "utf-8").digest("hex");
  }

  async add(fileToBeAdded) {
    const fileData = await fs.readFile(fileToBeAdded, { encoding: "utf-8" });   //reading the file
    const fileHash = this.hashObject(fileData); //Hashing it 
    console.log(fileHash);

    //we have hashed the file now we will add the hash file into the object folder
    const newFileHashedObjectPath = path.join(this.objectPath, fileHash); // .commitchain/object/folder
    await fs.writeFile(newFileHashedObjectPath, fileData); // .commitchain/object/folder-> fill add out file data
    // adding file to staging area first and then do the actual commit 
    this.updateStagingArea(fileToBeAdded,fileHash);
    console.log(`Added file ${fileToBeAdded}`);
  }

  //creating the content of the file index , and then converting it from string to json object 
  //then do add file -> hash file adn then add file to index 

  async updateStagingArea(filePath,fileHash){
    //reading the index file -
    const index = JSON.parse(await fs.readFile(this.indexPath,{encodeing: 'utf-8'}));
    index.push({path:filePath,hash:fileHash});
    await fs.writeFile(this.indexPath,JSON.stringify(index));
  }


  async commit(message){
    const index = JSON.parse()
  }

}

const commit_chain = new commitchain();
commit_chain.add('version_demo_sample.txt');
