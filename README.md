# helix-helpx

helix-helpx is the first web site rendered leveraging the [Helix](https://github.com/adobe/project-helix) platform and following the [hypermedia rendering pipepline](https://github.com/adobe/hypermedia-pipeline).

## Architecture

The content to render is defined in the [helix-config.yaml](./helix-config.yaml) file which contains the [strain](https://github.com/adobe/project-helix/tree/master/prototypes#strains) definition for this code repository. By default, this content is [](https://github.com/Adobe-Marketing-Cloud/reactor-user-docs).

The code is composed of

* [html.htl](./src/html.htl): the main htl template
* [html.pre.js](./src/html.pre.js): a [pre.js](https://github.com/adobe/hypermedia-pipeline#optional-the-wrapper-function) wrapper function that enhanced the payload to cover the needs of the htl template.
* some static content (css, image) for the need of the website

## Run

Pre-requisite: install the [Helix Command Line Interface](https://github.com/adobe/helix-cli)

Run:

```bash
#!/bin/bash
git clone https://github.com/adobe/helix-helpx.git
cd helix-helpx
hlx up
```

Now simply open: [http://localhost:3000/README.html](http://localhost:3000/README.html)

## "Publish"

Check [Getting Started guide](https://github.com/adobe/project-helix/blob/master/getting-started.md) for deployment.
