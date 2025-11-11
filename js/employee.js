const search = document.getElementById('search');
const tableRows = document.querySelectorAll('#employeeTable tr');

search.addEventListener('keyup', function () {
  const term = this.value.toLowerCase();
  tableRows.forEach(row => {
    const name = row.querySelector('td').innerText.toLowerCase();
    row.style.display = name.includes(term) ? '' : 'none';
  });
});
