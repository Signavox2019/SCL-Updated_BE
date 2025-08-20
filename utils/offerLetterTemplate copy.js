
module.exports = (user) => {
  // Helper function to format date (e.g., "Aug 06th 2025")
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
    return `${month} ${day}${daySuffix(day)} ${year}`;
  };

  const currentDate = formatDate(new Date());
  const joiningDate = user.batchStartDate ? formatDate(new Date(user.batchStartDate)) : '';

  return `
   <!DOCTYPE html>
<html lang="en">

<head>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #fff;
            color: #000;
            margin: 0;
            padding: 0;
        }
        .header-logo {
            position: absolute;
            top: 15mm;
            left: 5mm;
            width: 300px;
            height: 70px;
            z-index: 2;
        }
        .offer-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-top: 90px; /* pushes below the logo */
            margin-bottom: 40px;
        }

        .page {
            width: 100%;
            max-width: 280mm;
            min-height: 397mm;
            background: #fff;
            position: relative;
            padding: 20mm 5mm 15mm 5mm;
            box-sizing: border-box;
            page-break-after: always;
            overflow: hidden;
            margin: 0 auto;
        }

        .page::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('https://my-s3-for-scl-project.s3.ap-south-1.amazonaws.com/tickets/snignavox_icon.png');
            background-repeat: no-repeat;
            background-position: center center; /* keeps it in the middle */
            background-size: 600px auto; /* increased width while maintaining aspect ratio */
            opacity: 0.2; /* keep it slightly lighter for watermark effect */
            z-index: 0;
            pointer-events: none;
        }


        .content {
            position: relative;
            z-index: 1;
            font-size: 20px;
            font-weight: 500;
            line-height: 1.4;
            width: 100%;
            height: 100%;
            min-height: 380mm;
            max-height: 380mm;
            padding-bottom: 25mm; /* ensure content never overlaps footer */
            box-sizing: border-box;
            overflow: hidden; /* keep overflow within page */
            word-break: break-word;
            hyphens: auto;
        }

        h1,
        h2 {
            font-size: 20px;
            color: #000;
        }

        .date-right {
            text-align: right;
            font-size: 20px;
        }

        .footer {
            position: relative;
            left: 5mm;
            right: 5mm;
            top: 10mm;
            bottom: 5mm; /* stick footer near bottom on all pages */
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            color: #000;
            border-top: 2px solid #ccc;
            padding-top: 1px;
            background: #fff;
        }

        strong {
            font-weight: bold;
        }

        ul {
            margin: 0;
            padding-left: 20px;
        }

        // ol {
        //     padding-left: 20px;
        // }
        @media print {
            .page {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
            ol li,
            ul li {
                  margin-bottom: 12px; /* extra space between items */
}
    </style>
</head>

<body>

    <!-- PAGE 1 -->
    <div class="page">
    <img src="https://my-s3-for-scl-project.s3.ap-south-1.amazonaws.com/tickets/undefined.jfif" alt="Logo" class="header-logo" />

        <div class="content">
        <div class="offer-title">OFFER & APPOINTMENT LETTER</div>
            <div class="date-right">Date: ${currentDate}</div>
            <p>
                To,<br>
                <strong>${user.name || ''}</strong><br>
                ${user.employeeAddress || ''}
            </p>
            <p>Dear ${user.firstName || ''},</p>
            <p>Congratulations!</p>
            <p>
                After the discussion we had recently with you, we are pleased to offer you an appointment with
                <strong>SIGNAVOX TECHNOLOGIES PRIVATE LIMITED</strong> as per the terms and conditions mentioned below:
            </p>
            <ol>
                <li><strong>DATE OF JOINING</strong><br>
                    Your internship will commence from <strong>${joiningDate}</strong>.
                </li>
                <li><strong>DESIGNATION:</strong> Software Engineer Intern</li>
                <li><strong>PLACEMENT OF WORK</strong>
                    <ol type="i">
                        <li>Your place of work will be <strong>${user.placeOfWork || 'Hyderabad'}</strong>.</li>
                        <li>You may be required to work in any Position, Department or Shift as may be assigned from
                            time to time.</li>
                        <li>During your internship, you may be transferred to any of the establishments of the Company
                            or its associated Companies in which case you will be governed by the rules and regulations
                            applicable to that establishment.</li>
                    </ol>
                </li>
                <li><strong>WORKING HOURS</strong><br>
                    Company follows 9-hour workday and 05 working days a week, with Saturday and Sunday as weekly off
                    for General shift associates. The core working hours are from <strong>9.30 AM </strong> to <strong> 6.30 PM</strong>.
                </li>
                <li><strong>SECRECY</strong>
                    <ol type="i">
                        <li>If your employment is a full-time assignment, you shall devote your whole time and attention
                            to the interest of the Company and shall not engage in any other business/occupation.</li>
                        <li>You shall not conduct yourself in any manner amounting to breach of confidence or
                            inconsistent with the position held by you.</li>
                        <li>You shall not, at any time, during your employment or thereafter, disclose to any person,
                            firm or Company any information concerning the affairs of the Company or disclose, without
                            the written permission of the Company, any information which is or may be of a confidential
                            nature.</li>
                        <li>You are required to sign the non-disclosure agreement in the prescribed format which shall
                            form a part of these terms and conditions.</li>
                    </ol>
                </li>

                <li><strong>KEY POLICIES, PROCEDURES AND PRACTICES</strong><br></li>
                During your employment with SIGNAVOX TECHNOLOGIES (and where applicable after your employment has
                terminated) you must comply with all of the Company's policies and procedures and any legal and/or
                statutory and/or regulatory obligations, including (but not limited to) SIGNAVOX TECHNOLOGIES policies
                and procedures on, and any other obligations relating to, anti-bribery and corruption. Failure to do so
                may result in disciplinary action being taken against you.
                


            </ol>
        </div>
        <div class="footer">
            SIGNAVOX TECHNOLOGIES PVT LTD | Corp Work Hub, 81 Jubilee Enclave, Hitech city, Hyderabad, Telangana, India,
            500081
        </div>
    </div>
    <!-- PAGE 2 -->
    <div class="page">
        <div class="content">
        <ol>You should familiarize yourself with all policies and procedures that apply to your grade and business
                area as set out on intranet Signavoxtechnologies.com.</ol>
                <ol type="1" start="7">
                <li><strong>TERMINATION OF SERVICE</strong></li>                
            <ol type="i">
                  <li>This offer is our formal contract and must be read and accepted in conjunction with the
                        Internship Agreement, Proprietary Agreement and Disclosure of interest. In addition to these
                        terms and conditions stated in the above documents, there are other Company policies and
                        procedures which you agree to observe and follow during your internship and, if applicable,
                        subsequent employment with SIGNAVOX TECHNOLOGIES. These Company policies and procedures may vary
                        from time to time.</li>
                    <li>If at any time, in the opinion of the Company, which shall be final, you are deemed insolvent or
                        are found to be guilty of dishonesty, disobedience, disorderly behavior, negligence,
                        indiscipline, absence from duty without permission or of any conduct unbecoming of the status
                        and the post you hold in the Company’s interests or of violation of one or more terms of this
                        letter, your services may be terminated immediately.</li>
                    <li>You have been offered this position in good faith that all the information and documents
                        provided by you at the time of engagement for this employment are true and correct. Your
                        continued engagement is contingent upon satisfactory background verification. SIGNAVOX
                        TECHNOLOGIES reserves the right to terminate your engagement without notice if the information
                        and documents provided by you are found incorrect. SIGNAVOX TECHNOLOGIES warrants the right to
                        recover the costs incurred to perform the check and withhold your salary thereby.</li>
                    <li>Absences from Work: Approval should be obtained in advance from your line manager for absence
                        during working hours. If unexpected circumstances mean that this is not possible, you should
                        inform your line manager as soon as possible. Absence without approval and / or explanation will
                        be dealt with under the disciplinary procedure which could result in disciplinary action being
                        taken against you by the Company and which may result in the termination of your employment.
                    </li>
                    <li>Absences from Work: Approval should be obtained in advance from your line manager for absence
                        during working hours. If unexpected circumstances mean that this is not possible, you should
                        inform your line manager as soon as possible. Absence without approval and / or explanation will
                        be dealt with under the disciplinary procedure which could result in disciplinary action being
                        taken against you by the Company and which may result in the termination of your employment.
                    </li>
                    </ol>
                    <li><strong>NOTICE PERIOD</strong><br>
                        During the Internship program, your services can be terminated by giving <strong>15
                            days'</strong>
                        notice in writing or Notice period payment in lieu of notice if any allegation bounded legally
                        in
                        primary inquiry that you have committed any crime such as rape, fraud, theft, murder and sexual
                        harassment as per Signavox Technologies policy and local legislation. Signavox Technologies also
                        expect you to provide the above facts voluntarily. In the case of shorter notice, the liability
                        will
                        be restricted to payment for the proportionate period which falls short of the notice period. If
                        during the notice period you are absent without permission, your services can be terminated
                        without
                        any notice. Any reduction/waiver of the notice period shall be at the sole discretion of the
                        Company. The Company may adjust the balance of annual leave, while granting such a
                        reduction/waiver.
                    </li>
                    <li><strong>RULES & REGULATIONS</strong><br>
                        During your employment, you will be governed by the rules, regulations of service and orders of
                        the
                        Company that may be in force and which may be amended, altered or extended from time to time.
                        Your
                        acceptance of this offer carries with it your agreement to observe all such rules, regulations
                        and
                        orders.
                        <br><br>
                        This offer will automatically lapse if not accepted within one (1) week from the date of this
                        letter.
                    </li>
                    <li><strong>PERSONAL INFORMATION (PI)</strong><br>
                        During the process of your employment with Signavox Technologies you may provide or confirm the
                        confidential data or any information that is related to you personally, including without
                        limitation
                        to your email,
                    </li>

                    </ol>
        </div>
        <div class="footer">SIGNAVOX TECHNOLOGIES PVT LTD | Corp Work Hub, 81 Jubilee Enclave, Hitech city, Hyderabad,
            Telangana, India, 500081</div>
    </div>

    <!-- PAGE 3 -->
    <div class="page">
        <div class="content">
        <ol> contact details, taxation, family records, medical records (PI). You confirm that
                        Signavox Technologies may collect use, transfer, store or process such PI as per SIGNAVOX
                        TECHNOLOGIES policies, for Signavox Technologies benefits, Background verifications, financial
                        and
                        accounting aspects and for risk management purposes.</ol>
            <ol type="1" start="11">
            <li><strong>COMPENSATION STRUCTURE</strong><br>
                        The company may, at any time, review and/or restructure the compensation package based on
                        Signavox
                        Technologies Policy or any local legislation changes.
                    </li>
                    <li><strong>TAX IMPLICATION</strong>
                        You are responsible for declarations and implications for all your personal income tax and
                        filing
                        returns on a yearly basis.
                    </li>
            <li><strong>PAYROLL DATE</strong>
                        <strong>Stipend will be paid monthly, subject to applicable taxes, duties, cases, and other
                            statutory deductions, and is typically processed at the end of each month for associates who
                            have joined before the payroll cut-off.</strong>
                    </li>
                    <li><strong>TOTAL REWARDS</strong>
                    SIGNAVOX TECHNOLOGIES offers a Total Rewards plan with a comprehensive compensation package per
                    market standards, including an excellent benefits program comprising health, finance and wealth,
                    work/life balance, and learning and career benefits.
                    <br>
                    <ol type="i">
                        <li><strong>COMPENSATION</strong><br>
                            SIGNAVOX TECHNOLOGIES is an equal opportunity employer. We believe in Fair and equitable
                            compensation for every associate. We always value excellence and high performance.
                        </li>  
                During your Internship period, you shall be eligible for a stipend of <strong>INR 7000
                                (Rupees Seven Thousand Only)</strong> on last 3 months.
                        <li><strong>LEAVE</strong>
                            You will be entitled to 3 Days leave in a calendar year on a monthly accrual basis.
                        </li>
                        <li><strong>HOLIDAYS</strong>
                            You shall be eligible for 9 holidays in a calendar year per the published calendar.
                            Associates working out of client locations shall follow the client holiday calendar.
                        </li>
                        <li><strong>HEALTH AND WELL-BEING</strong>
                            SIGNAVOX TECHNOLOGIES promotes employee health and wellbeing and helps create positive
                            working environments
                            where individuals and organizations can thrive. We believe good health and wellbeing are
                            core enablers which drive
                            employee engagement and organizational performance.
                        </li>
                        <li><strong>REWARDS AND RECOGNITION PROGRAMS</strong><br>
                            SIGNAVOX TECHNOLOGIES acknowledges employee contributions, commitment and efforts towards
                            endeavors and achievements. The Company promotes performance and optimistic behaviors
                            through various monetary and non-monetary Rewards and Recognition programs.
                        </li>
                        <li><strong>CAREER DEVELOPMENT</strong>
                            We are huge advocates for your career development. We will encourage you to move to
                            higher/new roles and reach your potential by frequently helping you to enhance skills or
                            acquire new skills.
                        </li>
                </li>
                </ol>
            </ol>
        </div>
        <div class="footer">SIGNAVOX TECHNOLOGIES PVT LTD | Corp Work Hub, 81 Jubilee Enclave, Hitech city, Hyderabad,
            Telangana, India, 500081</div>
    </div>

    

</body>

</html>
  `;
};
