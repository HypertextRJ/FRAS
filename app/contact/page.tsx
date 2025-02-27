import React from "react";
import { MapPin, Phone, Printer, Globe, Mail, Clock, AlertCircle, Home, Book, Award, Users } from "lucide-react";

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-2">Contact Us</h1>
          <div className="w-20 h-1 bg-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Reach out to the National Institute of Technology Mizoram for any inquiries or assistance. We are here to help you with all your questions.
          </p>
        </div>

        {/* Main Content: Two Columns */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column: Contact Information */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 transform transition-transform duration-300">
            <div className="flex items-center mb-6">
              <Home className="text-blue-600 w-8 h-8" />
              <h2 className="text-2xl md:text-3xl font-semibold ml-2">
                National Institute of Technology Mizoram
              </h2>
            </div>
            
            <div className="space-y-5">
              {/* Address */}
              <div className="flex items-start">
                <MapPin className="mr-3 mt-1 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">Address</h3>
                  <p className="text-gray-600">
                    Chaltlang, Aizawl<br />
                    Mizoram - 796012<br />
                    India
                  </p>
                </div>
              </div>
              
              {/* Phone */}
              <div className="flex items-start">
                <Phone className="mr-3 mt-1 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">Phone</h3>
                  <p className="text-gray-600">+91-389-2391236</p>
                  <p className="text-gray-600">+91-389-2391774</p>
                </div>
              </div>
              
              {/* Fax */}
              <div className="flex items-start">
                <Printer className="mr-3 mt-1 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">Fax</h3>
                  <p className="text-gray-600">+91-389-2391699</p>
                </div>
              </div>
              
              {/* Website */}
              <div className="flex items-start">
                <Globe className="mr-3 mt-1 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">Website</h3>
                  <a href="https://www.nitmz.ac.in" className="text-blue-600 hover:underline transition-colors">
                    www.nitmz.ac.in
                  </a>
                </div>
              </div>
              
              {/* Office Hours */}
              <div className="flex items-start">
                <Clock className="mr-3 mt-1 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">Office Hours</h3>
                  <p className="text-gray-600">
                    Monday to Friday: 9:00 AM - 5:30 PM<br />
                    Saturday: 9:00 AM - 1:00 PM<br />
                    <span className="text-sm italic">Closed on Sundays and Public Holidays</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Key Contacts Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <Users className="text-blue-600 w-6 h-6" />
                <h3 className="text-xl font-semibold ml-2">Key Contacts</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Director */}
                <div className="flex items-start">
                  <Mail className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Director</p>
                    <a href="mailto:director@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      director@nitmz.ac.in
                    </a>
                  </div>
                </div>
                
                {/* Registrar */}
                <div className="flex items-start">
                  <Mail className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Registrar</p>
                    <a href="mailto:registrar@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      registrar@nitmz.ac.in
                    </a>
                  </div>
                </div>
                
                {/* Dean (Academic) */}
                <div className="flex items-start">
                  <Book className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Dean (Academic)</p>
                    <a href="mailto:dean_academic@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      dean_academic@nitmz.ac.in
                    </a>
                  </div>
                </div>
                
                {/* Dean (Research & Consultancy) */}
                <div className="flex items-start">
                  <Award className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Dean (Research &amp; Consultancy)</p>
                    <a href="mailto:dean_rc@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      dean_rc@nitmz.ac.in
                    </a>
                  </div>
                </div>
                
                {/* Dean (Planning & Development) */}
                <div className="flex items-start">
                  <Award className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Dean (Planning &amp; Development)</p>
                    <a href="mailto:dean_pd@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      dean_pd@nitmz.ac.in
                    </a>
                  </div>
                </div>
                
                {/* Dean (Student Welfare) */}
                <div className="flex items-start">
                  <Users className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Dean (Student Welfare)</p>
                    <a href="mailto:dean_sw@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      dean_sw@nitmz.ac.in
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Map, Department Contacts, Emergency Contacts */}
          <div className="space-y-8">
            {/* Map Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <h2 className="text-2xl font-semibold mb-4 text-blue-800 flex items-center">
                <MapPin className="mr-2 text-blue-600" />
                Our Location
              </h2>
              <div className="rounded-lg overflow-hidden border-4 border-white shadow-md aspect-video">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.9705976920677!2d92.71838537537943!3d23.748427878671716!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x374deb31aaaaaaad%3A0x93da2ffe45c6c53e!2sNational%20Institute%20of%20Technology%20-%20Mizoram!5e0!3m2!1sen!2sin!4v1740572235947!5m2!1sen!2sin"
                  className="w-full h-full"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  title="NIT Mizoram Location"
                ></iframe>
              </div>
            </div>

            {/* Department Contacts Section (styled like Key Contacts) */}
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 transform transition-transform duration-300">
              <div className="flex items-center mb-4">
                <Book className="text-blue-600 w-6 h-6" />
                <h2 className="text-xl font-semibold ml-2 text-blue-800">Department Contacts</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Computer Science & Engineering */}
                <div className="flex items-start">
                  <Mail className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Computer Science &amp; Engineering</p>
                    <a href="mailto:hod_cse@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      hod_cse@nitmz.ac.in
                    </a>
                    <p className="text-gray-600 text-sm">+91-389-2391235</p>
                  </div>
                </div>
                {/* Electrical & Electronics Engineering */}
                <div className="flex items-start">
                  <Mail className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Electrical &amp; Electronics Engineering</p>
                    <a href="mailto:hod_eee@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      hod_eee@nitmz.ac.in
                    </a>
                    <p className="text-gray-600 text-sm">+91-389-2391236</p>
                  </div>
                </div>
                {/* Electronics & Communication */}
                <div className="flex items-start">
                  <Mail className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Electronics &amp; Communication</p>
                    <a href="mailto:hod_ece@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      hod_ece@nitmz.ac.in
                    </a>
                    <p className="text-gray-600 text-sm">+91-389-2391237</p>
                  </div>
                </div>
                {/* Civil Engineering */}
                <div className="flex items-start">
                  <Mail className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Civil Engineering</p>
                    <a href="mailto:hod_ece@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      hod_ce@nitmz.ac.in
                    </a>
                    <p className="text-gray-600 text-sm">+91-389-2391237</p>
                  </div>
                </div>
                {/* Mechanical Engineering */}
                <div className="flex items-start">
                  <Mail className="mr-2 mt-1 text-blue-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Mechanical Engineering</p>
                    <a href="mailto:hod_me@nitmz.ac.in" className="text-blue-600 hover:underline text-sm">
                      hod_me@nitmz.ac.in
                    </a>
                    <p className="text-gray-600 text-sm">+91-389-2391238</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contacts Section (styled like Key Contacts) */}
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 transform transition-transform duration-300">
              <div className="flex items-center mb-4">
                <AlertCircle className="text-red-600 w-6 h-6" />
                <h2 className="text-xl font-semibold ml-2 text-red-800">Emergency Contacts</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Security Office */}
                <div className="flex items-start">
                  <AlertCircle className="mr-2 mt-1 text-red-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Security Office</p>
                    <p className="text-red-600 text-sm">+91-389-2391777</p>
                  </div>
                </div>
                {/* Medical Center */}
                <div className="flex items-start">
                  <AlertCircle className="mr-2 mt-1 text-red-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Medical Center</p>
                    <p className="text-red-600 text-sm">+91-389-2391888</p>
                  </div>
                </div>
                {/* Hostel Warden */}
                <div className="flex items-start">
                  <AlertCircle className="mr-2 mt-1 text-red-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Hostel Warden</p>
                    <p className="text-red-600 text-sm">+91-389-2391444</p>
                  </div>
                </div>
                {/* IT Support */}
                <div className="flex items-start">
                  <AlertCircle className="mr-2 mt-1 text-red-600 w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">IT Support</p>
                    <p className="text-red-600 text-sm">+91-389-2391555</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        {/* <div className="mt-12 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} National Institute of Technology Mizoram. All Rights Reserved.</p>
        </div> */}
      </div>
    </div>
  );
};

export default ContactPage;
