#!/usr/bin/env node
//this will directly run the folder in terminal - this will only give read/execute access 
//this are the immportant libary - that we are required :
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { diffLines } from 'diff';
import chalk from 'chalk';
import { Command } from 'commander';

const program = new Command();

class Groot {
    //creating all the important file and folders -
    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.groot');
        this.objectsPath = path.join(this.repoPath, 'objects'); // .groot/objects
        this.headPath = path.join(this.repoPath, 'HEAD'); // .groot/HEAD
        this.indexPath = path.join(this.repoPath, 'index'); // .groot/index
        this.init();
    }

    //writing stuff into Head and index file -
    async init() {
        await fs.mkdir(this.objectsPath, {recursive: true});
        try {
            await fs.writeFile(this.headPath, '', {flag: 'wx'}); // wx: open for writing. fails if file exists
            await fs.writeFile(this.indexPath, JSON.stringify([]), {flag: 'wx'});
        } catch (error) {
            console.log("Already initialised the .groot folder");
        }
    }

    //This function will take the content and hash it out -
    hashObject(content) {
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }


    async add(fileToBeAdded) {
        // fileToBeAdded: path/to/file
        const fileData = await fs.readFile(fileToBeAdded, { encoding: 'utf-8' }); // read the file
        const fileHash = this.hashObject(fileData); // hash the file
        console.log(fileHash);
        const newFileHashedObjectPath = path.join(this.objectsPath, fileHash); // .groot/objects/abc123
        await fs.writeFile(newFileHashedObjectPath, fileData);
        //taking the file , hashing it out and then pushing it into the staging area first -
        await this.updateStagingArea(fileToBeAdded, fileHash);
        console.log(`Added ${fileToBeAdded}`);

    }
    

    async updateStagingArea(filePath, fileHash) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' })); // read the index file
        index.push({ path : filePath, hash: fileHash }); // add the file to the index
        await fs.writeFile(this.indexPath, JSON.stringify(index)); // write the updated index file
    }

    async commit(message) {
        //reading the staging area data -
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            timeStamp: new Date().toISOString(),
            message,
            files: index,
            parent: parentCommit
        };

        //when we are done with the commit we clear the staging area and commit it push it into object folder
        const commitHash = this.hashObject(JSON.stringify(commitData));
        const commitPath = path.join(this.objectsPath, commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));
        await fs.writeFile(this.headPath, commitHash); // update the HEAD to point to the new commit
        await fs.writeFile(this.indexPath, JSON.stringify([])); // clear the staging area
        console.log(`Commit successfully created: ${commitHash}`); 

    }

    //this function is give me the current head path -
    async getCurrentHead() {
        try {
            return await fs.readFile(this.headPath, { encoding: 'utf-8' });
        } catch(error) {
            return null;
        }
    }

    //starting from the current head keep going to next node and printing it 
    async log() {
        let currentCommitHash = await this.getCurrentHead();;
        while(currentCommitHash) {
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), { encoding: 'utf-8' }));
            console.log(`---------------------\n`)
            console.log(`Commit: ${currentCommitHash}\nDate: ${commitData.timeStamp}\n\n${commitData.message}\n\n`);

            currentCommitHash = commitData.parent;
        }
    }

    async showCommitDiff(commitHash) {
        const commitData = JSON.parse(await this.getCommitData(commitHash));
        if(!commitData) {
            console.log("Commit not found");
            return;
        }
        console.log("Changes in the last commit are: ");

        for(const file of commitData.files) {
            console.log(`File: ${file.path}`);
            const fileContent = await this.getFileContent(file.hash);
            console.log(fileContent);

            if(commitData.parent) {
                // get the parent commit data
                const parentCommitData = JSON.parse(await this.getCommitData(commitData.parent));
                const getParentFileContent = await this.getParentFileContent(parentCommitData, file.path);
                if(getParentFileContent !== undefined) {
                    console.log('\nDiff:');
                    const diff = diffLines(getParentFileContent, fileContent);

                    // console.log(diff);
                    
                    //using the diff package and compare parent file content and child file content -
                    diff.forEach(part => {
                        //in case new file is added 
                        if(part.added) {
                            process.stdout.write(chalk.green("++" + part.value));
                        } else if(part.removed) {     //in case  file is removed 
                            process.stdout.write(chalk.red("--" + part.value));
                        } else {
                            process.stdout.write(chalk.grey(part.value));   //no change at all
                        }
                    });
                    console.log(); // new line
                } else {
                    console.log("New file in this commit");
                }

            } else {
                console.log("First commit");
            }

        }
    }

    async getParentFileContent(parentCommitData, filePath) {
        const parentFile = parentCommitData.files.find(file => file.path === filePath);
        if(parentFile) {
            // get the file content from the parent commit and return the content
            return await this.getFileContent(parentFile.hash);
        }
    }

    async getCommitData(commithash) {
        const commitPath = path.join(this.objectsPath, commithash);
        try {
            return await fs.readFile(commitPath, { encoding: 'utf-8'});
        } catch(error) {
            console.log("Failed to read the commit data", error);
            return null;
        }
    }

    async getFileContent(fileHash) {
        const objectPath = path.join(this.objectsPath, fileHash);
        return fs.readFile(objectPath, { encoding: 'utf-8' });
    }



}


program.command('init').action(async () => {
    const groot = new Groot();
});

program.command('add <file>').action(async (file) => {
    const groot = new Groot();
    await groot.add(file);
});

program.command('commit <message>').action(async (message) => {
    const groot = new Groot();
    await groot.commit(message);
});

program.command('log').action(async () => {
    const groot = new Groot();
    await groot.log();
});

program.command('show <commitHash>').action(async (commitHash) => {
    const groot = new Groot();
    await groot.showCommitDiff(commitHash);
});

// console.log(process.argv);
program.parse(process.argv);