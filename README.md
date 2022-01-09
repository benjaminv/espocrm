This is a downloaded copy of official release of 7.0.8  

# Permission Issues

Due to file ownership issues after download from official release, `cd` to the file `root` folder and change owership to current user, for example:  

```ruby 
cd /Users/benhu/PhpstormProjects/CRM/crm-dev && 
sudo chown -R benhu .
```

Then deal with the 755 and 644 permissions as suggested during the installation.