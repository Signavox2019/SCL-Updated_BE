
module.exports = (user) => {
    // Helper function to format date (e.g., "Aug 20th 2025")
    const formatDate = (date) => {
        if (!date) return '';
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        const daySuffix = (d) => {
            if (d > 4 && d < 21) return 'th';
            switch (d % 10) {
                case 1: return 'st';
                case 2: return 'nd';
                case 3: return 'rd';
                default: return 'th';
            }
        };
        return `${day}${daySuffix(day)} ${month} ${year}`;
    };

    const currentDate = formatDate(new Date());
    const joiningDate = user.batchStartDate ? formatDate(new Date(user.batchStartDate)) : 'September 15th 2025';

    return `
  <!DOCTYPE html>
  <html lang="en">
 <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offer Letter</title>
      <style>
          @page {
              size: A4;
              margin: 18mm 22mm;
          }
          
          body {
              font-family: 'Times New Roman', serif;
              font-size: 15pt;
              line-height: 1.5;
              color: #000;
              margin: 0;
              padding: 0;
              background: #fff;
          }
          
          .page {
              width: 100%;
              min-height: 297mm;
              background: #fff;
              /* ✅ Only watermark kept, background box removed */
            //   background-image: url('https://signavox-career-ladder.s3.eu-north-1.amazonaws.com/logos/snignavox_icon_no_bg.png');
              background-image: url('https://signavox-career-ladder.s3.eu-north-1.amazonaws.com/logos/snignavox_icon_no_bg.png');
              background-repeat: no-repeat;
              background-position: center center;
              background-size: 70% auto;
              position: relative;
              margin: 0 auto;
              padding: 0;
              display: flex;
              flex-direction: column;
          }

          /* Subtle overlay to reduce watermark thickness (opacity) */
          .page::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 70mm;
              background: rgba(255,255,255,0.7);
              z-index: 0;
              pointer-events: none;
          }

          .wm { display: none; }

          .page:not(:last-of-type) {
              page-break-after: always;
          }
          
          .header {
              display: flex;
              align-items: center;
              justify-content: flex-start;
              gap: 12px;
              text-align: left;
              margin: 10px 0 6px 0;
              padding-top: 6px;
              flex-shrink: 0;
              position: relative;
              z-index: 1;
          }
          
          .company-logo {
              width: 260px;
              height: auto;
          }

          .offer-title {
              font-size: 22pt;
              font-weight: bold;
              text-align: center;
              margin: 8px 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
              position: relative;
              z-index: 1;
          }
          
          .date-section {
              text-align: right;
              margin: 10px 0 6px 0;
              font-weight: bold;
              position: relative;
              z-index: 1;
              flex-shrink: 0;
          }
          
          .content {
              flex: 1;
              text-align: justify;
              margin: 6px 0 10px 0;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              position: relative;
              z-index: 1;
          }
          
          .greeting { margin: 6px 0; }
          .greeting span { font-weight: bold; }
          .main-content { margin: 6px 0; flex: 1; }

          .numbered-list {
              margin: 6px 0;
              padding-left: 0;
              list-style-position: inside;
          }
          
          .numbered-list li {
              margin-bottom: 12px;
              text-align: justify;
          }
          
          .sub-list {
              margin: 6px 0;
              padding-left: 0;
              list-style-position: inside;
          }
          
          .sub-list li {
              margin-bottom: 8px;
              text-align: justify;
          }
          
          .bold { font-weight: bold; }
          .footer { 
              text-align: center; 
              position: absolute; 
              bottom: 6mm; 
              left: 0; 
              right: 0; 
              z-index: 1; 
              border-top: 1px solid #000; 
              padding-top: 2mm; 
              box-sizing: border-box; 
              display: block;
          }

          .footer span {
              display: inline-block;
              max-width: calc(100% - 44mm); /* keeps text aligned with page margins */
          }

          /* Annexure A styles */
          .annexure-title {
              text-align: center;
              font-weight: bold;
              margin: 6mm 0 3mm 0;
              font-size: 15pt;
          }
          .annexure-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 15pt;
              z-index: 1;
          }
          .annexure-table th,
          .annexure-table td {
              border: 1px solid #000;
              padding: 6px 8px;
              vertical-align: middle;
          }
          .annexure-table th { text-align: left; }
          .annexure-right { text-align: right; white-space: nowrap; }
          .annexure-highlight { background: #d8f3dc; font-weight: bold; }
          .annexure-notes {
              margin-top: 6px;
              font-size: 15pt;
              line-height: 1.5;
          }
          .annexure-intro {
              font-size: 15pt;
              margin: 4mm 0 6mm 0;
          }
          .annexure-signature {
              display: grid;
              grid-template-columns: 1fr 1.2fr;
              gap: 20mm;
              align-items: center;
              margin-top: 2mm;
              font-size: 15pt;
          }
          .annexure-signature .label { font-weight: bold; }
          .annexure-signature .signature-block { font-weight: bold; }
          .annexure-signature .left-sec { text-align: left; justify-self: start; width: 180mm; position: relative; top: 20px; left: 50px; }
          .annexure-signature .right-sec { text-align: left; justify-self: end; width: 180mm;position: relative;top: 50px; left: -100px; }
          .sig-field { margin-top: 0mm; }
          
          @media print {
              .page {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
              }
              .footer { 
                  position: fixed; 
                  bottom: -1mm; 
                  left: 0; 
                  right: 0; 
                  border-top: 1px solid #000; 
                  padding-top: 2mm; 
                  box-sizing: border-box; 
                  display: block;
              }
              .footer span {
                  display: inline-block;
                  max-width: calc(100% - 44mm);
              }
                  
            .annexure-signature {
                gap: 14mm;
                margin-top: 15mm;
            }

            .annexure-signature .left-sec img {
                max-width: 220px;
            }
            .annexure-signature .left-sec .signature-block {
                margin-top: -4mm;
            }
          }
      </style>
  </head>
  <body>
      <div class="page">
          <div class="wm"></div>
          <div class="header">
              <img src="https://signavox-career-ladder.s3.eu-north-1.amazonaws.com/logos/Signavox_black_no_bg.png" alt="Company Logo" class="company-logo">
              
          </div>
          <div class="offer-title">Offer Letter</div>
          
          <div class="date-section">
              Date: ${currentDate}
          </div>
          
          <div class="content">
              <div class="greeting">
                  Dear <span>${user.name}</span>,
              </div>
              
              <div class="main-content">
                  <p><strong>Congratulations!</strong></p>
                  
                  <p>After the discussion we had recently with you, we are pleased to offer you an Internship at <strong>SIGNAVOX TECHNOLOGIES PRIVATE LIMITED</strong> as per the terms and conditions mentioned below:</p>
                  
                  <ol class="numbered-list">
                      <li><strong>DATE OF JOINING</strong><br>
                          Your internship will commence from <strong>${joiningDate}</strong>.
                      </li>
                      
                      <li><strong>DESIGNATION:</strong> Associate Software Engineer Intern</li>
                      
                      <li><strong>PLACEMENT OF WORK</strong>
                          <ol type="i" class="sub-list">
                              <li>Your place of work will be <strong>Hyderabad</strong>.</li>
                              <li>You may be required to work in any Position, Department or Shift as may be assigned from time to time.</li>
                              <li>During your internship, you may be transferred to any of the establishments of the Company or its associated Companies in which case you will be governed by the rules and regulations applicable to that establishment.</li>
                          </ol>
                      </li>
                      
                      <li><strong>WORKING HOURS</strong><br>
                          Company follows 9-hour workday and 05 working days a week, with Saturday and Sunday as weekly off for General shift associates. The core working hours are from <strong>9:30 AM to 6:30 PM</strong>.
                      </li>
                      
                      <li><strong>SECRECY</strong>
                          <ol type="i" class="sub-list">
                              <li>If your employment is a full-time assignment, you shall devote your whole time and attention to the interest of the Company and shall not engage in any other business/occupation.</li>
                              <li>You shall not conduct yourself in any manner amounting to breach of confidence or inconsistent with the position held by you.</li>
                              <li>You shall not, at any time, during your employment or thereafter, disclose to any person, firm or Company any information concerning the affairs of the Company or disclose, without the written permission of the Company, any information which is or may be of a confidential nature.</li>
                              <li>You are required to sign the non-disclosure agreement in the prescribed format which shall form a part of these terms and conditions.</li>
                          </ol>
                      </li>
                      
                      <li><strong>EMPLOYEE BENEFITS</strong><br>
                          As an intern at SIGNAVOX TECHNOLOGIES PRIVATE LIMITED, you will be entitled to a range of benefits designed to support your overall well-being and professional development throughout the internship period. These include basic health insurance coverage, access to essential company tools and internal resources, and participation in training programs aligned with your project work. Upon successful completion of the internship, you will be awarded a formal certificate acknowledging your contribution and tenure. Interns demonstrating exceptional performance may be considered for performance-based incentives or future employment opportunities, including Pre-Placement Offers (PPOs), subject to business requirements. The company may also extend access to select team engagements, internal events, or learning platforms to encourage broader exposure and integration into the corporate environment.
                      </li>
                      
                  </ol>
              </div>
          </div>
          <div class="footer">Signavox Technologies, AV Hub, 5th floor, Vittal Rao Nagar, HITEC City, Hyderabad, Telangana, 500081</div>
      </div>
      
      <div class="page">
          <div class="wm"></div>
          <div class="content">
          <ol class="numbered-list" start="7">
          <li><strong>KEY POLICIES, PROCEDURES AND PRACTICES</strong><br>
                          During your employment with SIGNAVOX TECHNOLOGIES (and where applicable after your employment has concluded) you must comply with all of the Company's policies and procedures and any legal and/or statutory and/or regulatory obligations, including (but not limited to) SIGNAVOX TECHNOLOGIES policies and procedures on, and any other obligations relating to, anti-bribery and corruption. Failure to do so may result in disciplinary action being taken against you. You should familiarize yourself with all policies and procedures that apply to your grade and business area as set out on intranet Signavoxtechnologies.com.
                          
                      </li>
                  <li><strong>TERMINATION OF SERVICE</strong>
                      <ol type="i" class="sub-list">
                          <li>This offer is our formal contract and must be read and accepted in conjunction with the Internship Agreement, Proprietary Agreement and Disclosure of interest. In addition to these terms and conditions stated in the above documents, there are other Company policies and procedures which you agree to observe and follow during your internship and, if applicable, subsequent employment with SIGNAVOX TECHNOLOGIES. These Company policies and procedures may vary from time to time.</li>
                          <li>If at any time, in the opinion of the Company, which shall be final, you are deemed insolvent or are found to be guilty of dishonesty, disobedience, disorderly behavior, negligence, indiscipline, absence from duty without permission or of any conduct unbecoming of the status and the post you hold in the Company's interests or of violation of one or more terms of this letter, your services may be terminated immediately.</li>
                          <li>You have been offered this position in good faith that all the information and documents provided by you at the time of engagement for this employment are true and correct. Your continued engagement is contingent upon satisfactory background verification. SIGNAVOX TECHNOLOGIES reserves the right to terminate your engagement without notice if the information and documents provided by you are found incorrect. SIGNAVOX TECHNOLOGIES warrants the right to recover the costs incurred to perform the check and withhold your salary thereby.</li>
                          <li>Absences from Work: Approval should be obtained in advance from your line manager for absence during working hours. If unexpected circumstances mean that this is not possible, you should inform your line manager as soon as possible. Absence without approval and / or explanation will be dealt with under the disciplinary procedure which could result in disciplinary action being taken against you by the Company and which may result in the termination of your employment.</li>
                          <li>In cases of serious misconduct, including but not limited to fraud, theft, sexual harassment, or any other criminal activity as defined by law or company policy, SIGNAVOX TECHNOLOGIES PRIVATE LIMITED reserves the right to terminate the internship with immediate effect, without any notice.</li>
                      </ol>
                  </li>
                  
                  <li><strong>RULES & REGULATIONS</strong><br>
                      During your employment, you will be governed by the rules, regulations of service and orders of the Company that may be in force and which may be amended, altered or extended from time to time. Your acceptance of this offer carries with it your agreement to observe all such rules, regulations and orders.<br><br>
                      This offer will automatically lapse if not accepted within one (1) week from the date of this letter.
                  </li>
                  
                  <li><strong>PERSONAL INFORMATION (PI)</strong><br>
                      During the process of your employment with Signavox Technologies you may provide or confirm the confidential data or any information that is related to you personally, including without limitation to your email, contact details, taxation, family records, medical records (PI). You confirm that Signavox Technologies may collect use, transfer, store or process such PI as per SIGNAVOX TECHNOLOGIES policies, for Signavox Technologies benefits, Background verifications, financial and accounting aspects and for risk management purposes.
                  </li>
              </ol>
          </div>
          <div class="footer">Signavox Technologies, AV Hub, 5th floor, Vittal Rao Nagar, HITEC City, Hyderabad, Telangana, 500081</div>
      </div>
      <div class="page">
          <div class="wm"></div>
          <div class="content">
          <ol start="11">
          <li><strong>COMPENSATION STRUCTURE</strong><br>
                      The company may, at any time, review and/or restructure the compensation package based on Signavox Technologies Policy or any local legislation changes.
                  </li>
          <li><strong>PAYROLL DATE</strong><br>
                      Stipend will be paid monthly, subject to applicable and is typically processed at the end of each month for associates who have joined before the payroll cut-off.
                  </li>
           <li><strong>TOTAL REWARDS</strong><br>
                      SIGNAVOX TECHNOLOGIES offers a Total Rewards plan with a comprehensive compensation package per market standards, including an excellent benefits program comprising health, finance and wealth, work/life balance, and learning and career benefits.
                  </li>
              </ol>
              <ol>
              <ol type="i" class="sub-list">
                          <li><strong>COMPENSATION</strong><br>
                              SIGNAVOX TECHNOLOGIES is an equal opportunity employer. We believe in Fair and equitable compensation for every associate. We always value excellence and high performance.<br><br>
                              During your Internship period, you shall be eligible for a stipend of <strong>INR 7000 (Rupees Seven Thousand Only)</strong>.<br><br>
        
                          </li>
                          <li><strong>LEAVE</strong><br>
                              You will be entitled to 3 leaves in a calendar year on a monthly accrual basis.
                          </li>
                          <li><strong>HOLIDAYS</strong><br>
                              As an intern, you will be eligible to observe all official company holidays as outlined in the annual holiday calendar applicable to regular employees.
                          </li>
                          <li><strong>HEALTH AND WELL-BEING</strong><br>
                              SIGNAVOX TECHNOLOGIES promotes employee health and wellbeing and helps create positive working environments where individuals and organizations can thrive. We believe good health and wellbeing are core enablers which drive employee engagement and organizational performance.
                          </li>
                          <li><strong>REWARDS AND RECOGNITION PROGRAMS</strong><br>
                              SIGNAVOX TECHNOLOGIES acknowledges employee contributions, commitment and efforts towards endeavors and achievements. The Company promotes performance and optimistic behaviors through various monetary and non-monetary Rewards and Recognition programs.
                          </li>
                          <li><strong>CAREER DEVELOPMENT</strong><br>
                              We are huge advocates for your career development. We will encourage you to move to higher/new roles and reach your potential by frequently helping you to enhance skills or acquire new skills.
                          </li>
                      </ol>
                      </ol>
            </div>
          <div class="footer">Signavox Technologies, AV Hub, 5th floor, Vittal Rao Nagar, HITEC City, Hyderabad, Telangana, 500081</div>
      </div>
      <div class="page">
          <div class="content">
          
              <div class="annexure-title">Annexure A</div>
              <p class="annexure-intro">This Annexure applies only to interns who are eligible for permanent employment with the Company and sets out the related compensation and terms.</p>
              <table class="annexure-table">
                  <tr>
                      <th style="width:60%">Name: <span class="bold">${user.name ? user.title + '. ' + user.name.toUpperCase() : 'Mr.TEST INTERN FORMAT'}</span></th>
                      <th class="annexure-right">&nbsp;</th>
                  </tr>
                  <tr>
                      <th>Title: <span class="bold">Software Engineer</span></th>
                      <th class="annexure-right">&nbsp;</th>
                  </tr>
                  <tr>
                      <th>Components of Total Cost to Company</th>
                      <th class="annexure-right">Rs. (Per Annum)</th>
                  </tr>
                  <tr>
                      <td>Basic</td>
                      <td class="annexure-right">1,30,000.00</td>
                  </tr>
                  <tr>
                      <td>HRA</td>
                      <td class="annexure-right">52,000.00</td>
                  </tr>
                  <tr>
                      <td>Conveyance</td>
                      <td class="annexure-right">20,800.00</td>
                  </tr>
                  <tr>
                      <td>Medical Allowance</td>
                      <td class="annexure-right">18,200.00</td>
                  </tr>
                  <tr>
                      <td>Leave Travel Allow</td>
                      <td class="annexure-right">23,400.00</td>
                  </tr>
                  <tr>
                      <td>Employee PF</td>
                      <td class="annexure-right">15,600.00</td>
                  </tr>
                  <tr class="annexure-highlight">
                      <td>Gross Salary (A)</td>
                      <td class="annexure-right">2,60,000</td>
                  </tr>
                  <tr>
                      <td>Additional Benefits (B)</td>
                      <td class="annexure-right">&nbsp;</td>
                  </tr>
                  <tr>
                      <td>Variable Pay</td>
                      <td class="annexure-right">50,000.00</td>
                  </tr>
                  <tr>
                      <td>PERFORMANCE BONUS</td>
                      <td class="annexure-right">40,000.00</td>
                  </tr>
                  <tr class="annexure-highlight">
                      <td>Cost to Company (CTC) (A + B)</td>
                      <td class="annexure-right">3,50,000</td>
                  </tr>
                  <tr>
                      <td colspan="2">Taxes (TDS) and other Govt deductions are applicable as per law</td>
                  </tr>
                  <tr>
                      <td colspan="2" class="annexure-notes">
                          <div><span class="bold">Bonus & Statutory Bonus</span>, Performance bonus is applicable annually based on employee performance ratio.</div>
                          <div>(*) Maximum amount based on 100% performance; VP shall be payable as per Variable Pay Program applicable for the Financial Year</div>
                          <div><span class="bold">For Fresher</span> during the training period, employees shall receive half of their monthly salary only.</div>
                          <div><span class="bold">Additional Benefits</span> : In addition to the above, you will also be eligible for the below-mentioned benefits -</div>
                          <div>• <span class="bold">Gratuity</span> : As per Payment of Gratuity Act</div>
                      </td>
                  </tr>
              </table>
          </div>
          <div class="annexure-signature">
                <div class="left-sec">
                    <div>With Best Wishes</div>
                    <img src="https://signavox-career-ladder.s3.eu-north-1.amazonaws.com/logos/Paul+Sir+sign.png" alt="Director Signature" srcset="">
                    <div class="signature-block">
                        <div class="director-name">Paul Tirupathi</div>
                        <div class="director-role">Chief Executive Officer</div>
                        <div class="label">SIGNAVOX TECHNOLOGIES PVT LTD</div>
                    </div>
                </div>
                <div class="right-sec">
                      <div class="label">Accepted</div>
                      <div class="sig-field">Name:</div>
                      <div class="sig-field">Signature:</div>
                      <div class="sig-field">Date:</div>
                </div>
            </div>
          <div class="footer">Signavox Technologies, AV Hub, 5th floor, Vittal Rao Nagar, HITEC City, Hyderabad, Telangana, 500081</div>
      </div>  
  </body>
  </html>
    `;
};
