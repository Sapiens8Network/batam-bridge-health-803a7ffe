-- hospitals
INSERT INTO public.hospitals (id,name,location,address,accreditation,specialties,contact_phone,contact_email) VALUES
('11111111-1111-4111-8111-000000000001','Batam Medical Centre','Batam Centre','Jl. Engku Putri No. 1, Batam Centre','KARS Plenary / JCI candidate','{Dental,Ophthalmology,Orthopaedics,"Health Screening"}','+62 778 111 001','care@batammedical.id'),
('11111111-1111-4111-8111-000000000002','Nagoya Family Hospital','Nagoya','Jl. Imam Bonjol, Nagoya, Batam','KARS Utama','{Dental,"Health Screening",Cardiology}','+62 778 111 002','hello@nagoyafamily.id'),
('11111111-1111-4111-8111-000000000003','Harbour Bay Specialist Clinic','Harbour Bay','Harbour Bay Downtown, Batu Ampar','KARS Madya','{Ophthalmology,Endoscopy,"Health Screening"}','+62 778 111 003','clinic@harbourbayspecialist.id');

-- doctors
INSERT INTO public.doctors (id,hospital_id,name,specialty,license_reference,languages,years_experience) VALUES
('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','Dr. Andi Pratama','Dental Implantology','IDI-DEN-4471','{English,Indonesian,Malay}',14),
('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000001','Dr. Sari Wijaya','Ophthalmology','IDI-OPH-2210','{English,Indonesian}',11),
('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000001','Dr. Rudi Hartono','Orthopaedic Surgery','IDI-ORT-8890','{English,Indonesian}',18),
('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000002','Dr. Mei Ling Tan','General Dentistry','IDI-DEN-3312','{English,Mandarin,Indonesian}',9),
('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-000000000002','Dr. Budi Santoso','Cardiology','IDI-CAR-5567','{English,Indonesian}',16),
('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000003','Dr. Farah Nasution','Gastroenterology','IDI-GAS-7741','{English,Indonesian,Malay}',12);

-- treatments
INSERT INTO public.treatments (id,name,category,description,recovery_days,duration_minutes,keywords) VALUES
('33333333-3333-4333-8333-000000000001','Dental Implant','Dental','Single titanium implant with crown',2,120,'{implant,tooth,dental,gigi}'),
('33333333-3333-4333-8333-000000000002','Full Mouth Dental Restoration','Dental','Multi-implant and crown restoration programme',4,300,'{"full mouth",restoration,veneer,crowns}'),
('33333333-3333-4333-8333-000000000003','LASIK Eye Surgery','Ophthalmology','Bilateral femtosecond LASIK',2,45,'{lasik,eye,vision,myopia}'),
('33333333-3333-4333-8333-000000000004','Cataract Surgery','Ophthalmology','Phacoemulsification with monofocal lens',3,60,'{cataract,lens,eye}'),
('33333333-3333-4333-8333-000000000005','Executive Health Screening','Health Screening','Full-day comprehensive screening package',1,240,'{screening,"check up",medical,health}'),
('33333333-3333-4333-8333-000000000006','Knee Arthroscopy','Orthopaedics','Minimally invasive knee joint surgery',5,90,'{knee,arthroscopy,orthopaedic,joint}'),
('33333333-3333-4333-8333-000000000007','Gastroscopy & Colonoscopy','Endoscopy','Dual endoscopy under sedation',1,75,'{gastroscopy,colonoscopy,endoscopy,scope}'),
('33333333-3333-4333-8333-000000000008','Cardiac Screening','Cardiology','Echo, ECG and stress test package',1,180,'{heart,cardiac,ecg,echo}');

-- Batam prices per hospital (hospital multiplier applied to the base price)
INSERT INTO public.hospital_treatment_prices (hospital_id,treatment_id,price_sgd,doctor_fee_sgd,hospital_fee_sgd,diagnostics_sgd,medication_sgd)
SELECT h.id, t.id,
  round(b.base * m.mult, 2),
  round(b.base * 0.12 * m.mult, 2),
  round(b.base * 0.10 * m.mult, 2),
  round(b.base * 0.08 * m.mult, 2),
  round(b.base * 0.05 * m.mult, 2)
FROM (VALUES
  ('Dental Implant', 1250.00),
  ('Full Mouth Dental Restoration', 8200.00),
  ('LASIK Eye Surgery', 1850.00),
  ('Cataract Surgery', 1600.00),
  ('Executive Health Screening', 420.00),
  ('Knee Arthroscopy', 3900.00),
  ('Gastroscopy & Colonoscopy', 690.00),
  ('Cardiac Screening', 560.00)
) AS b(tname, base)
JOIN public.treatments t ON t.name = b.tname
JOIN public.hospitals h ON true
JOIN (VALUES
  ('Batam Medical Centre', 1.00),
  ('Nagoya Family Hospital', 0.92),
  ('Harbour Bay Specialist Clinic', 0.96)
) AS m(hname, mult) ON m.hname = h.name;

-- Singapore benchmarks
INSERT INTO public.singapore_benchmarks (treatment_id,benchmark_min_sgd,benchmark_max_sgd,benchmark_average_sgd,benchmark_travel_sgd,benchmark_accommodation_sgd,source_name,source_date)
SELECT t.id, b.mn, b.mx, b.avg, 0, 0, 'Singapore private hospital published rates', DATE '2025-11-01'
FROM (VALUES
  ('Dental Implant', 3800.00, 5600.00, 4600.00),
  ('Full Mouth Dental Restoration', 24000.00, 38000.00, 30000.00),
  ('LASIK Eye Surgery', 3400.00, 5200.00, 4300.00),
  ('Cataract Surgery', 4200.00, 7000.00, 5400.00),
  ('Executive Health Screening', 900.00, 1800.00, 1250.00),
  ('Knee Arthroscopy', 11000.00, 16000.00, 13200.00),
  ('Gastroscopy & Colonoscopy', 1900.00, 3200.00, 2400.00),
  ('Cardiac Screening', 1200.00, 2400.00, 1700.00)
) AS b(tname, mn, mx, avg)
JOIN public.treatments t ON t.name = b.tname;

-- hotels / transport / ferries
INSERT INTO public.hotels (id,name,location,address,price_per_night_sgd,distance_to_hospital_km,rating) VALUES
('44444444-4444-4444-8444-000000000001','Harmoni One Convention Hotel','Batam Centre','Jl. Raja Isa, Batam Centre',68.00,1.8,4.3),
('44444444-4444-4444-8444-000000000002','Nagoya Plaza Hotel','Nagoya','Jl. Imam Bonjol, Nagoya',52.00,3.4,4.0),
('44444444-4444-4444-8444-000000000003','Radisson Golf & Convention','Batam Centre','Jl. Duyung, Sei Jodoh',95.00,4.1,4.6);

INSERT INTO public.transport_options (type,name,origin,destination,estimated_cost_sgd,estimated_duration_minutes) VALUES
('CAR','Private car transfer','Batam Centre Ferry Terminal','Hospital',18.00,20),
('SHUTTLE','Shared hospital shuttle','Batam Centre Ferry Terminal','Hospital',8.00,35),
('CAR','Hotel to hospital return','Hotel','Hospital',12.00,15),
('AMBULANCE','Medical transfer ambulance','Ferry Terminal','Hospital',85.00,25);

INSERT INTO public.ferry_options (operator_name,origin_terminal,destination_terminal,estimated_cost_sgd,estimated_duration_minutes) VALUES
('Batam Fast','HarbourFront Centre, Singapore','Batam Centre',62.00,60),
('Sindo Ferry','HarbourFront Centre, Singapore','Sekupang',58.00,55),
('Majestic Fast Ferry','Tanah Merah, Singapore','Nongsapura',68.00,50);

-- patients
INSERT INTO public.patients (id,name,phone,country,preferred_channel,whatsapp_id,telegram_id,preferred_language,traveller_count) VALUES
('55555555-5555-4555-8555-000000000001','Tan Wei Ming','+65 9123 4501','SINGAPORE','WHATSAPP','6591234501',NULL,'English',1),
('55555555-5555-4555-8555-000000000002','Nurul Aisyah','+65 9123 4502','SINGAPORE','TELEGRAM',NULL,'tg-4502','English',2),
('55555555-5555-4555-8555-000000000003','Jonathan Lim','+65 9123 4503','SINGAPORE','WHATSAPP','6591234503',NULL,'English',1),
('55555555-5555-4555-8555-000000000004','Priya Raman','+65 9123 4504','SINGAPORE','WHATSAPP','6591234504',NULL,'English',3),
('55555555-5555-4555-8555-000000000005','Chen Hui Fang','+65 9123 4505','SINGAPORE','TELEGRAM',NULL,'tg-4505','Mandarin',2),
('55555555-5555-4555-8555-000000000006','Marcus Ong','+65 9123 4506','SINGAPORE','WHATSAPP','6591234506',NULL,'English',1);

-- medical requests
INSERT INTO public.medical_requests (id,reference,patient_id,hospital_id,original_message,treatment_id,ai_confidence,ai_request,traveller_count,preferred_date,preferred_nights,status,priority,channel,hospital_review,human_takeover,takeover_reasons,takeover_opened_at) VALUES
('66666666-6666-4666-8666-000000000001','HTH-100001','55555555-5555-4555-8555-000000000001','11111111-1111-4111-8111-000000000001','Hi, how much for a dental implant in Batam? I can travel next month for 2 nights.','33333333-3333-4333-8333-000000000001',0.94,'{"treatment":"Dental Implant","treatmentCategory":"Dental","requirements":["Panoramic X-ray","Fasting not required"],"specialRequirements":[]}',1,current_date + 21,2,'HOSPITAL_REVIEW_REQUIRED','NORMAL','WHATSAPP','PENDING',false,'{}',NULL),
('66666666-6666-4666-8666-000000000002','HTH-100002','55555555-5555-4555-8555-000000000002','11111111-1111-4111-8111-000000000003','Looking for LASIK for myself and my sister. Prefer a weekend trip.','33333333-3333-4333-8333-000000000003',0.91,'{"treatment":"LASIK Eye Surgery","treatmentCategory":"Ophthalmology","requirements":["Pre-op corneal scan","No contact lenses 7 days prior"],"specialRequirements":["Two patients travelling together"]}',2,current_date + 14,2,'DOCTOR_REVIEW_REQUIRED','HIGH','TELEGRAM','APPROVED',false,'{}',NULL),
('66666666-6666-4666-8666-000000000003','HTH-100003','55555555-5555-4555-8555-000000000003','11111111-1111-4111-8111-000000000002','Need a full health screening package, one day trip only.','33333333-3333-4333-8333-000000000005',0.88,'{"treatment":"Executive Health Screening","treatmentCategory":"Health Screening","requirements":["10 hour fasting"],"specialRequirements":[]}',1,current_date + 7,1,'AI_ITINERARY_READY','NORMAL','WHATSAPP',NULL,false,'{}',NULL),
('66666666-6666-4666-8666-000000000004','HTH-100004','55555555-5555-4555-8555-000000000004','11111111-1111-4111-8111-000000000001','My father needs knee surgery. He uses a wheelchair, is that possible in Batam?','33333333-3333-4333-8333-000000000006',0.62,'{"treatment":"Knee Arthroscopy","treatmentCategory":"Orthopaedics","requirements":["MRI report","Pre-anaesthetic clearance"],"specialRequirements":["Wheelchair accessible transfer","Elderly patient with carer"]}',3,current_date + 30,5,'HUMAN_TAKEOVER','URGENT','WHATSAPP',NULL,true,'{"Low AI confidence on clinical complexity","Accessibility requirements need manual confirmation"}',now() - interval '2 hours'),
('66666666-6666-4666-8666-000000000005','HTH-100005','55555555-5555-4555-8555-000000000005','11111111-1111-4111-8111-000000000003','Gastroscopy and colonoscopy for me and my husband please.','33333333-3333-4333-8333-000000000007',0.93,'{"treatment":"Gastroscopy & Colonoscopy","treatmentCategory":"Endoscopy","requirements":["Bowel preparation kit","Sedation consent"],"specialRequirements":["Mandarin speaking coordinator"]}',2,current_date + 10,1,'CONFIRMED_BOOKING','NORMAL','TELEGRAM','APPROVED',false,'{}',NULL),
('66666666-6666-4666-8666-000000000006','HTH-100006','55555555-5555-4555-8555-000000000006','11111111-1111-4111-8111-000000000002','Cardiac screening done last month - thanks, sending my friend over next.','33333333-3333-4333-8333-000000000008',0.96,'{"treatment":"Cardiac Screening","treatmentCategory":"Cardiology","requirements":["No caffeine 12 hours prior"],"specialRequirements":[]}',1,current_date - 20,1,'COMPLETED','LOW','WHATSAPP','APPROVED',false,'{}',NULL);

-- itineraries built from the trusted price + benchmark tables
INSERT INTO public.itineraries (medical_request_id,hospital_id,doctor_id,treatment_cost_sgd,doctor_fee_sgd,hospital_fee_sgd,diagnostics_cost_sgd,medication_cost_sgd,ferry_cost_sgd,hotel_cost_sgd,transport_cost_sgd,other_cost_sgd,singapore_benchmark_sgd,singapore_benchmark_travel_sgd,singapore_benchmark_accommodation_sgd,status)
SELECT r.id, r.hospital_id, d.id,
  p.price_sgd, p.doctor_fee_sgd, p.hospital_fee_sgd, p.diagnostics_sgd, p.medication_sgd,
  62.00 * r.traveller_count * 2,
  68.00 * r.preferred_nights,
  18.00 * 2,
  25.00,
  sb.benchmark_average_sgd,
  0, 0,
  CASE r.status
    WHEN 'CONFIRMED_BOOKING' THEN 'PATIENT_CONFIRMED'::public.itinerary_status
    WHEN 'COMPLETED' THEN 'PATIENT_CONFIRMED'::public.itinerary_status
    WHEN 'DOCTOR_REVIEW_REQUIRED' THEN 'HOSPITAL_CONFIRMED'::public.itinerary_status
    ELSE 'DRAFT'::public.itinerary_status
  END
FROM public.medical_requests r
JOIN public.hospital_treatment_prices p ON p.hospital_id = r.hospital_id AND p.treatment_id = r.treatment_id
JOIN public.singapore_benchmarks sb ON sb.treatment_id = r.treatment_id
LEFT JOIN public.doctors d ON d.hospital_id = r.hospital_id
  AND d.id = (SELECT dd.id FROM public.doctors dd WHERE dd.hospital_id = r.hospital_id ORDER BY dd.created_at LIMIT 1);

UPDATE public.itineraries i SET
  total_batam_sgd = t.total,
  estimated_savings_sgd = t.bench - t.total,
  estimated_savings_percentage = CASE WHEN t.bench > 0 THEN round(((t.bench - t.total) / t.bench) * 100, 2) ELSE 0 END
FROM (
  SELECT id,
    treatment_cost_sgd + doctor_fee_sgd + hospital_fee_sgd + diagnostics_cost_sgd + medication_cost_sgd
      + ferry_cost_sgd + hotel_cost_sgd + transport_cost_sgd + other_cost_sgd AS total,
    singapore_benchmark_sgd + singapore_benchmark_travel_sgd + singapore_benchmark_accommodation_sgd AS bench
  FROM public.itineraries
) t WHERE t.id = i.id;

-- itinerary day-by-day steps
INSERT INTO public.itinerary_items (itinerary_id,day_number,time,type,title,description,location,status,sort_order)
SELECT i.id, s.day, s.time, s.type, s.title, s.description, s.location,
  CASE WHEN i.status IN ('PATIENT_CONFIRMED','HOSPITAL_CONFIRMED') THEN 'CONFIRMED'::public.item_status ELSE 'ESTIMATED'::public.item_status END,
  s.sort
FROM public.itineraries i
JOIN (VALUES
  (1,'07:30','FERRY','Ferry from Singapore','Depart HarbourFront Centre with Batam Fast','HarbourFront Centre, Singapore',1),
  (1,'09:00','TRANSPORT','Arrival & private transfer','Meet-and-greet at the terminal, transfer to hospital','Batam Centre Ferry Terminal',2),
  (1,'10:00','TREATMENT','Consultation & procedure','Doctor consultation, diagnostics and the scheduled procedure','Hospital',3),
  (1,'16:00','ACCOMMODATION','Hotel check-in & recovery','Rest at the recovery hotel near the hospital','Recovery hotel',4),
  (2,'10:00','FOLLOW_UP','Post-procedure review','Follow-up check and medication handover','Hospital',5),
  (2,'15:00','FERRY','Return ferry to Singapore','Transfer to terminal and return sailing','Batam Centre Ferry Terminal',6)
) AS s(day,time,type,title,description,location,sort) ON true;

-- quotes
INSERT INTO public.quotes (itinerary_id,created_by,source,status,approved_at,sent_at,notes)
SELECT i.id, 'HERMES_AI', 'AI_ESTIMATE',
  CASE r.status
    WHEN 'HOSPITAL_REVIEW_REQUIRED' THEN 'PENDING_REVIEW'::public.quote_status
    WHEN 'DOCTOR_REVIEW_REQUIRED' THEN 'PENDING_REVIEW'::public.quote_status
    WHEN 'CONFIRMED_BOOKING' THEN 'APPROVED'::public.quote_status
    WHEN 'COMPLETED' THEN 'APPROVED'::public.quote_status
    ELSE 'DRAFT'::public.quote_status
  END,
  CASE WHEN r.status IN ('CONFIRMED_BOOKING','COMPLETED') THEN now() - interval '3 days' ELSE NULL END,
  CASE WHEN r.status IN ('CONFIRMED_BOOKING','COMPLETED') THEN now() - interval '3 days' ELSE NULL END,
  'Generated from hospital price list and Singapore benchmark data.'
FROM public.itineraries i JOIN public.medical_requests r ON r.id = i.medical_request_id;

-- doctor reviews
INSERT INTO public.doctor_reviews (medical_request_id,doctor_id,status,proposed_treatment,estimated_duration_minutes,appointment_at,comments,reviewed_at)
VALUES
('66666666-6666-4666-8666-000000000002','22222222-2222-4222-8222-000000000002','PENDING','LASIK Eye Surgery (bilateral)',45,now() + interval '14 days','Awaiting corneal scan review before confirming suitability.',NULL),
('66666666-6666-4666-8666-000000000005','22222222-2222-4222-8222-000000000006','APPROVED','Gastroscopy & Colonoscopy under sedation',75,now() + interval '10 days','Suitable for day procedure. Bowel prep kit to be couriered.',now() - interval '4 days'),
('66666666-6666-4666-8666-000000000006','22222222-2222-4222-8222-000000000005','APPROVED','Cardiac Screening package',180,now() - interval '20 days','Completed, results released to patient.',now() - interval '22 days');

-- AI activity events
INSERT INTO public.ai_activity_events (medical_request_id,event_type,status,message,metadata,started_at,completed_at,duration_ms)
SELECT r.id, e.event_type, 'DONE', e.message, jsonb_build_object('reference', r.reference),
  r.created_at + (e.offset_s || ' seconds')::interval,
  r.created_at + ((e.offset_s + 1) || ' seconds')::interval,
  e.duration
FROM public.medical_requests r
JOIN (VALUES
  ('MESSAGE_RECEIVED','Inbound patient message received',0,180),
  ('INTENT_DETECTED','Medical tourism intent detected',2,940),
  ('TREATMENT_MATCHED','Treatment matched against hospital catalogue',4,1120),
  ('COST_CALCULATED','Cost engine produced SGD package total',6,760),
  ('ITINERARY_DRAFTED','Draft itinerary generated for hospital review',8,1480)
) AS e(event_type,message,offset_s,duration) ON true;

-- messages
INSERT INTO public.messages (patient_id,medical_request_id,channel,direction,message_type,raw_text,sent_at,delivery_status)
SELECT r.patient_id, r.id, r.channel, 'INBOUND', 'PATIENT', r.original_message, r.created_at, 'DELIVERED'
FROM public.medical_requests r;

INSERT INTO public.messages (patient_id,medical_request_id,channel,direction,message_type,raw_text,sent_at,delivery_status)
SELECT r.patient_id, r.id, r.channel, 'OUTBOUND', 'AI',
  'Thanks ' || p.name || '! We are preparing your Batam care plan and will send your itinerary shortly.',
  r.created_at + interval '30 seconds', 'DELIVERED'
FROM public.medical_requests r JOIN public.patients p ON p.id = r.patient_id;

-- audit trail
INSERT INTO public.audit_log (medical_request_id,entity,entity_id,action,actor,new_value)
SELECT r.id,'medical_requests',r.id,'SEEDED','SYSTEM',jsonb_build_object('status',r.status) FROM public.medical_requests r;