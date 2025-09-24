const registerForm = document.getElementById('registerCustomerForm');
const registerResult = document.getElementById('registerResult');

const stampForm = document.getElementById('stampForm');
const stampResult = document.getElementById('stampResult');
const stampCard = document.getElementById('stampCard');

const retrieveForm = document.getElementById('retrieveIdForm');
const retrieveResult = document.getElementById('retrieveResult');
const idCardCanvas = document.getElementById('idCardCanvas');
const downloadIdCardBtn = document.getElementById('downloadIdCardBtn');

const DRAGON_STAMP_COUNT = 6;

function clearMessages() {
  registerResult.textContent = '';
  stampResult.textContent = '';
  retrieveResult.textContent = '';
  stampCard.innerHTML = '';
  idCardCanvas.style.display = 'none';
  downloadIdCardBtn.style.display = 'none';
}

function createStampElement(active) {
  const stamp = document.createElement('div');
  stamp.classList.add('stamp');
  if (active) {
    stamp.classList.add('active');
  }
  return stamp;
}

function renderStamps(count) {
  stampCard.innerHTML = '';
  for (let i = 1; i <= DRAGON_STAMP_COUNT; i++) {
    stampCard.appendChild(createStampElement(i <= count));
  }
}

// Register new customer
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const name = registerForm.customerName.value.trim();
    const mobile = registerForm.customerMobile.value.trim();

    if (!name || !mobile.match(/^\d{10}$/)) {
      registerResult.textContent = 'Please enter valid name and 10-digit mobile number.';
      registerResult.className = 'result-message';
      return;
    }

    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile }),
      });
      const data = await res.json();

      if (res.ok) {
        registerResult.textContent = `Customer registered successfully! Customer ID: ${data.customerId}`;
        registerResult.className = 'result-message success';
      } else {
        registerResult.textContent = data.message || 'Registration failed.';
        registerResult.className = 'result-message';
      }
    } catch (err) {
      registerResult.textContent = 'Error registering customer.';
      registerResult.className = 'result-message';
    }
  });
}

// Stamp purchase
if (stampForm) {
  stampForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const mobile = stampForm.stampMobile.value.trim();

    if (!mobile.match(/^\d{10}$/)) {
      stampResult.textContent = 'Please enter a valid 10-digit mobile number.';
      stampResult.className = 'result-message';
      return;
    }

    try {
      const res = await fetch('/api/customers/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();

      if (res.ok) {
        stampResult.textContent = data.message;
        stampResult.className = 'result-message success';
        renderStamps(data.stamps);
      } else {
        stampResult.textContent = data.message || 'Stamping failed.';
        stampResult.className = 'result-message';
        stampCard.innerHTML = '';
      }
    } catch (err) {
      stampResult.textContent = 'Error stamping purchase.';
      stampResult.className = 'result-message';
    }
  });
}

// Retrieve ID card
if (retrieveForm) {
  retrieveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const mobile = retrieveForm.retrieveMobile.value.trim();

    if (!mobile.match(/^\d{10}$/)) {
      retrieveResult.textContent = 'Please enter a valid 10-digit mobile number.';
      retrieveResult.className = 'result-message';
      return;
    }

    try {
      const res = await fetch(`/api/customers/retrieve/${mobile}`);
      const data = await res.json();

      if (res.ok) {
        retrieveResult.textContent = 'Customer found. ID card generated below.';
        retrieveResult.className = 'result-message success';
        drawIdCard(data.customer);
      } else {
        retrieveResult.textContent = data.message || 'Customer not found.';
        retrieveResult.className = 'result-message';
      }
    } catch (err) {
      retrieveResult.textContent = 'Error retrieving customer.';
      retrieveResult.className = 'result-message';
    }
  });
}

function drawIdCard(customer) {
  const ctx = idCardCanvas.getContext('2d');
  idCardCanvas.style.display = 'block';
  downloadIdCardBtn.style.display = 'inline-block';

  // Clear canvas
  ctx.clearRect(0, 0, idCardCanvas.width, idCardCanvas.height);

  // Background
  ctx.fillStyle = '#ef5350';
  ctx.fillRect(0, 0, idCardCanvas.width, idCardCanvas.height);

  // White card area
  ctx.fillStyle = '#fff';
  ctx.fillRect(15, 15, idCardCanvas.width - 30, idCardCanvas.height - 30);

  // Text
  ctx.fillStyle = '#ef5350';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('RK DRAGON PANIPURI', 30, 45);

  ctx.fillStyle = '#333';
  ctx.font = '16px Arial';
  ctx.fillText(`Customer Name: ${customer.name}`, 30, 80);
  ctx.fillText(`Mobile Number: ${customer.mobile}`, 30, 110);
  ctx.fillText(`Customer ID: ${customer.customerId}`, 30, 140);

  ctx.fillText(`Stamps: ${customer.stamps}/6`, 30, 170);

  // Draw dragon stamps
  const dragonImg = new Image();
  dragonImg.src = 'dragon.svg';
  dragonImg.onload = () => {
    const startX = 200;
    const startY = 60;
    const stampSize = 30;
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = i < customer.stamps ? 1 : 0.3;
      ctx.drawImage(dragonImg, startX + i * (stampSize + 5), startY, stampSize, stampSize);
    }
    ctx.globalAlpha = 1;
  };
}

// Download ID card button
if (downloadIdCardBtn) {
  downloadIdCardBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'CustomerIDCard.png';
    link.href = idCardCanvas.toDataURL('image/png');
    link.click();
  });
}