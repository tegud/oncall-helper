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

`{
    "victorops": {
        "voApiId": "12345",
        "voApiKey: "ImASecretDontPutMeInGithub!"
    },
    "elasticsearch": { "host": "myelasticsearch.org" }
}`

## Usage

Once installed and configured, call oncall-helper-victorops with the following arguments:

`node index team-stub`

This will set the data for 2 days ago for the team "team-stub", alternatively, if you want to be able to specify the date:

`node index team-stub --start YYYY-MM-DD`

As it stands, oncall-helper-victorops is pretty primitive with multi-day shifts, so it only supports single days, the usage of the "start" argument, is to support longer periods in the future, reducing API calls.

e.g. with four on call teams, daily synchronisation would account for 124 API calls/month, well over a fifth of the allowed 500 API calls per month on the Basic Victorops Tier.

Our usage is to run a docker container per team, per morning to synchronise the data from 2 days ago (See: Limitations).

## Limitations

Retrieving history for the day before doesn't seem to work as expected, am planning on opening support ticket with Victorops
