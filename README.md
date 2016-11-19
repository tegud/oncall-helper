# oncall-helper-victorops

For a specific day, loads the on call shifts into the Oncall Helper database. For interface & notifiers see Oncall-Helper Repository

## Requirements
 - Node 6+
 - Victorops Account
 - Elasticsearch (other databases may be supported in the future)

## Installation

`npm i`

## Configuration

You'll need a config.json folder in the application root with the following format: 

`{ "voApiId": "12345", "voApiKey: "ImASecretDontPutMeInGithub!" }`

## Usage

Once installed and configured, call oncall-helper-victorops with the following arguments:

node index "team-stub"

This will set the data for 2 days ago for the team "team-stub", alternatively, if you want to be able to specify the date:

node index "team-stub" --date "YYYY-MM-DD"

## Limitations

Retrieving history for the day before doesnt seem to work as expected, am planning on opening support ticket with Victorops
