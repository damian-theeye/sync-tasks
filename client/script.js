
const execute = () => {
  const xhr = new XMLHttpRequest()

  const apiurl = (document.querySelector('input[name=api_url]').value || 'https://supervisor.theeye.io')

  if (apiurl[ apiurl.length - 1 ] === '/') {
    delete apiurl[ apiurl.length - 1 ]
  }
  const url = [
    apiurl, '/',
    document.querySelector('input[name=customer_name]').value,
    '/task/',
    document.querySelector('input[name=task_id]').value,
    '/job?output&access_token=',
    document.querySelector('input[name=access_token]').value,
  ].join('')

  xhr.open('POST', url)

  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

  xhr.onload = function() {
    if (xhr.status != 200) {
      console.log(`Error ${xhr.status}`)
      console.log(xhr.response)
    }

    let  data = JSON.parse(xhr.response)

    let  html = `Status: ${xhr.status}<br><br>Response: ${xhr.response}`

    document.getElementById('res').innerHTML = html
  }

  xhr.onError = function() {
    console.log('Request failed')
  }
  xhr.send( JSON.stringify({ task_arguments: [1,2,3,4,5,6,7,8,9,10,11] }) );
}

document.querySelector('input[value=submit]').addEventListener('click', function (event) {
  event.preventDefault()
  event.stopPropagation()
  execute()
}, false)
