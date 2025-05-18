import {
  Aircraft, Owner, Lessee, Lease, Payment, Maintenance, Document,
  InsertAircraft, InsertOwner, InsertLessee, InsertLease, InsertPayment, InsertMaintenance, InsertDocument,
  DashboardStats, AircraftWithDetails, LeaseWithDetails, MaintenanceWithDetails
} from "@shared/schema";

export interface IStorage {
  // Aircraft
  getAircraft(id: number): Promise<Aircraft | undefined>;
  getAllAircraft(): Promise<Aircraft[]>;
  createAircraft(aircraft: InsertAircraft): Promise<Aircraft>;
  updateAircraft(id: number, aircraft: Partial<InsertAircraft>): Promise<Aircraft | undefined>;
  deleteAircraft(id: number): Promise<boolean>;
  getAircraftWithDetails(id: number): Promise<AircraftWithDetails | undefined>;
  getAllAircraftWithDetails(): Promise<AircraftWithDetails[]>;

  // Owners
  getOwner(id: number): Promise<Owner | undefined>;
  getAllOwners(): Promise<Owner[]>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: number): Promise<boolean>;

  // Lessees (Flight Schools)
  getLessee(id: number): Promise<Lessee | undefined>;
  getAllLessees(): Promise<Lessee[]>;
  createLessee(lessee: InsertLessee): Promise<Lessee>;
  updateLessee(id: number, lessee: Partial<InsertLessee>): Promise<Lessee | undefined>;
  deleteLessee(id: number): Promise<boolean>;

  // Leases
  getLease(id: number): Promise<Lease | undefined>;
  getAllLeases(): Promise<Lease[]>;
  createLease(lease: InsertLease): Promise<Lease>;
  updateLease(id: number, lease: Partial<InsertLease>): Promise<Lease | undefined>;
  deleteLease(id: number): Promise<boolean>;
  getLeaseWithDetails(id: number): Promise<LeaseWithDetails | undefined>;
  getAllLeasesWithDetails(): Promise<LeaseWithDetails[]>;
  getLeasesForAircraft(aircraftId: number): Promise<Lease[]>;
  getLeasesForLessee(lesseeId: number): Promise<Lease[]>;

  // Payments
  getPayment(id: number): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  getPaymentsForLease(leaseId: number): Promise<Payment[]>;

  // Maintenance
  getMaintenance(id: number): Promise<Maintenance | undefined>;
  getAllMaintenance(): Promise<Maintenance[]>;
  createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance>;
  updateMaintenance(id: number, maintenance: Partial<InsertMaintenance>): Promise<Maintenance | undefined>;
  deleteMaintenance(id: number): Promise<boolean>;
  getMaintenanceForAircraft(aircraftId: number): Promise<Maintenance[]>;
  getUpcomingMaintenance(): Promise<MaintenanceWithDetails[]>;

  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  getDocumentsForEntity(relatedType: string, relatedId: number): Promise<Document[]>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private aircraft: Map<number, Aircraft>;
  private owners: Map<number, Owner>;
  private lessees: Map<number, Lessee>;
  private leases: Map<number, Lease>;
  private payments: Map<number, Payment>;
  private maintenance: Map<number, Maintenance>;
  private documents: Map<number, Document>;
  private currentIds: {
    aircraft: number;
    owner: number;
    lessee: number;
    lease: number;
    payment: number;
    maintenance: number;
    document: number;
  };

  constructor() {
    this.aircraft = new Map();
    this.owners = new Map();
    this.lessees = new Map();
    this.leases = new Map();
    this.payments = new Map();
    this.maintenance = new Map();
    this.documents = new Map();
    this.currentIds = {
      aircraft: 1,
      owner: 1,
      lessee: 1,
      lease: 1,
      payment: 1,
      maintenance: 1,
      document: 1
    };

    // Add sample data for development
    this.initSampleData();
  }

  private initSampleData() {
    // Create sample owners
    const owner1 = this.createOwner({
      name: "Aviation Ape Inc.",
      email: "contact@aviationape.com",
      phone: "813-555-0101",
      address: "123 Flight Ave, Tampa, FL 33607",
      notes: "Primary aircraft owner",
      paymentDetails: "Direct deposit to Bank of America #9876543210"
    });

    const owner2 = this.createOwner({
      name: "SkyVentures LLC",
      email: "info@skyventures.com",
      phone: "813-555-0202",
      address: "456 Wing St, Tampa, FL 33609",
      notes: "Owns multiple aircraft",
      paymentDetails: "Check payments preferred"
    });

    const owner3 = this.createOwner({
      name: "Sunshine Aviation",
      email: "contact@sunshineaviation.com",
      phone: "407-555-0303",
      address: "789 Cloud Dr, Orlando, FL 32801",
      notes: "New aircraft owner",
      paymentDetails: "Wire transfer to Chase #1234567890"
    });

    // Create sample lessees (flight schools)
    const lessee1 = this.createLessee({
      name: "Infinity Aero Club",
      email: "training@infinityaero.com",
      phone: "813-555-1000",
      address: "Tampa North Aero Park, Tampa, FL 33618",
      contactPerson: "Ricardo Foster",
      notes: "Established flight school with good payment history"
    });

    const lessee2 = this.createLessee({
      name: "Clearwater Aviation",
      email: "info@clearwateraviation.com",
      phone: "727-555-2000",
      address: "Clearwater Airpark, Clearwater, FL 33765",
      contactPerson: "Sarah Johnson",
      notes: "Growing flight school"
    });

    const lessee3 = this.createLessee({
      name: "Orlando Flight Academy",
      email: "training@orlandoflight.edu",
      phone: "407-555-3000",
      address: "Orlando Executive Airport, Orlando, FL 32803",
      contactPerson: "Michael Rodriguez",
      notes: "Large flight school with multiple locations"
    });

    // Create sample aircraft
    const aircraft1 = this.createAircraft({
      registration: "N159G",
      make: "Cessna",
      model: "172S Skyhawk",
      year: 2018,
      engineType: "Lycoming IO-360-L2A",
      totalTime: 1245,
      avionics: "Garmin G1000 NXi",
      image: "https://pixabay.com/get/g8ef761b4edb26fd2f832aca8a921b9b37b583c7e33e62db23962a81257f33892d6c8803977391faf10762f318a53e93a2a4d6bd2d0de50e3bae945b68c537ea2_1280.jpg",
      notes: "Aircraft is in excellent condition with recent interior refurbishment. Popular with flight students due to modern avionics package.",
      ownerId: owner1.id,
      status: "Leased"
    });

    const aircraft2 = this.createAircraft({
      registration: "N227AB",
      make: "Piper",
      model: "PA-28 Cherokee",
      year: 2016,
      engineType: "Lycoming O-360",
      totalTime: 2100,
      avionics: "Garmin G500",
      image: "https://images.unsplash.com/photo-1503560683205-acf61ac68a3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      notes: "Reliable training aircraft with good maintenance history.",
      ownerId: owner2.id,
      status: "Leased"
    });

    const aircraft3 = this.createAircraft({
      registration: "N443FL",
      make: "Diamond",
      model: "DA40 Star",
      year: 2020,
      engineType: "Continental IO-360",
      totalTime: 850,
      avionics: "Garmin G1000",
      image: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      notes: "Modern aircraft with excellent fuel efficiency.",
      ownerId: owner3.id,
      status: "Maintenance"
    });

    const aircraft4 = this.createAircraft({
      registration: "N789SR",
      make: "Cirrus",
      model: "SR22 G6",
      year: 2021,
      engineType: "Continental IO-550-N",
      totalTime: 450,
      avionics: "Cirrus Perspective+",
      image: "https://pixabay.com/get/g6d3d07393b5e5e17fa18cc361cdda250d2e889838899340703fc467856ae77924644561a37920fbdc3541af2c8c7ab3f62bbe2f8f8917941f63c0eb757b786f9_1280.jpg",
      notes: "High-performance aircraft with CAPS system.",
      ownerId: 2,
      status: "Available"
    });

    // Create sample leases
    const lease1 = this.createLease({
      aircraftId: aircraft1.id,
      lesseeId: lessee1.id,
      startDate: new Date("2022-12-15"),
      endDate: new Date("2023-12-14"),
      monthlyRate: 4200,
      minimumHours: 40,
      hourlyRate: 65,
      maintenanceTerms: "Agent responsible for all routine maintenance. Major Engine Overhaul: Owner/Agent split 60%/40%.",
      notes: "Lease agreement based on sample provided. Includes fuel and oil.",
      status: "Active",
      documentUrl: "/documents/lease-n159g.pdf"
    });

    const lease2 = this.createLease({
      aircraftId: aircraft2.id,
      lesseeId: lessee2.id,
      startDate: new Date("2023-02-01"),
      endDate: new Date("2024-01-31"),
      monthlyRate: 5100,
      minimumHours: 45,
      hourlyRate: 70,
      maintenanceTerms: "Lessee responsible for routine maintenance up to $500 per occurrence.",
      notes: "First lease with this flight school.",
      status: "Active",
      documentUrl: "/documents/lease-n227ab.pdf"
    });

    const lease3 = this.createLease({
      aircraftId: aircraft3.id,
      lesseeId: lessee3.id,
      startDate: new Date("2023-04-15"),
      endDate: new Date("2024-04-14"),
      monthlyRate: 3800,
      minimumHours: 35,
      hourlyRate: 75,
      maintenanceTerms: "Agent responsible for all maintenance.",
      notes: "Aircraft currently undergoing scheduled maintenance.",
      status: "Active",
      documentUrl: "/documents/lease-n443fl.pdf"
    });

    // Create sample payments
    const payment1 = this.createPayment({
      leaseId: lease1.id,
      amount: 4200,
      period: "December 2023",
      dueDate: new Date("2023-12-15"),
      paidDate: new Date("2023-12-14"),
      status: "Paid",
      notes: "Paid on time"
    });

    const payment2 = this.createPayment({
      leaseId: lease1.id,
      amount: 4200,
      period: "November 2023",
      dueDate: new Date("2023-11-15"),
      paidDate: new Date("2023-11-15"),
      status: "Paid",
      notes: "Paid on time"
    });

    const payment3 = this.createPayment({
      leaseId: lease1.id,
      amount: 4200,
      period: "October 2023",
      dueDate: new Date("2023-10-15"),
      paidDate: new Date("2023-10-16"),
      status: "Paid",
      notes: "Paid one day late"
    });

    const payment4 = this.createPayment({
      leaseId: lease2.id,
      amount: 5100,
      period: "December 2023",
      dueDate: new Date("2023-12-01"),
      paidDate: new Date("2023-12-01"),
      status: "Paid",
      notes: "Paid on time"
    });

    const payment5 = this.createPayment({
      leaseId: lease3.id,
      amount: 3800,
      period: "December 2023",
      dueDate: new Date("2023-12-15"),
      paidDate: undefined,
      status: "Pending",
      notes: "Payment expected on due date"
    });

    // Create sample maintenance records
    const maintenance1 = this.createMaintenance({
      aircraftId: aircraft3.id,
      type: "100 Hour Inspection",
      scheduledDate: new Date("2023-12-22"),
      completedDate: undefined,
      cost: 1200,
      status: "Scheduled",
      notes: "Regular 100-hour inspection",
      performedBy: "Tampa Aero Maintenance"
    });

    const maintenance2 = this.createMaintenance({
      aircraftId: aircraft1.id,
      type: "Annual Inspection",
      scheduledDate: new Date("2024-01-15"),
      completedDate: undefined,
      cost: 2500,
      status: "Scheduled",
      notes: "Required annual inspection",
      performedBy: "FlightLine Maintenance"
    });

    const maintenance3 = this.createMaintenance({
      aircraftId: aircraft2.id,
      type: "Avionics Update",
      scheduledDate: new Date("2024-01-28"),
      completedDate: undefined,
      cost: 3500,
      status: "Scheduled",
      notes: "Software update for Garmin systems",
      performedBy: "Avionics Solutions"
    });

    // Create sample documents
    this.createDocument({
      name: "N159G Lease Agreement",
      type: "Lease",
      url: "/documents/n159g-lease.pdf",
      relatedId: lease1.id,
      relatedType: "lease",
      uploadDate: new Date("2022-12-15")
    });

    this.createDocument({
      name: "N159G Registration Certificate",
      type: "Registration",
      url: "/documents/n159g-registration.pdf",
      relatedId: aircraft1.id,
      relatedType: "aircraft",
      uploadDate: new Date("2022-10-01")
    });

    this.createDocument({
      name: "N159G Insurance Policy",
      type: "Insurance",
      url: "/documents/n159g-insurance.pdf",
      relatedId: aircraft1.id,
      relatedType: "aircraft",
      uploadDate: new Date("2023-01-05")
    });
  }

  // Aircraft Methods
  async getAircraft(id: number): Promise<Aircraft | undefined> {
    return this.aircraft.get(id);
  }

  async getAllAircraft(): Promise<Aircraft[]> {
    return Array.from(this.aircraft.values());
  }

  async createAircraft(aircraft: InsertAircraft): Promise<Aircraft> {
    const id = this.currentIds.aircraft++;
    const newAircraft: Aircraft = { ...aircraft, id };
    this.aircraft.set(id, newAircraft);
    return newAircraft;
  }

  async updateAircraft(id: number, aircraft: Partial<InsertAircraft>): Promise<Aircraft | undefined> {
    const existingAircraft = this.aircraft.get(id);
    if (!existingAircraft) return undefined;

    const updatedAircraft = { ...existingAircraft, ...aircraft };
    this.aircraft.set(id, updatedAircraft);
    return updatedAircraft;
  }

  async deleteAircraft(id: number): Promise<boolean> {
    return this.aircraft.delete(id);
  }

  async getAircraftWithDetails(id: number): Promise<AircraftWithDetails | undefined> {
    const aircraft = this.aircraft.get(id);
    if (!aircraft) return undefined;

    const owner = aircraft.ownerId ? this.owners.get(aircraft.ownerId) : undefined;
    
    // Get current active lease
    const leases = Array.from(this.leases.values())
      .filter(lease => lease.aircraftId === id && lease.status === "Active");
    
    let currentLease = undefined;
    if (leases.length > 0) {
      const lease = leases[0];
      const lessee = lease.lesseeId ? this.lessees.get(lease.lesseeId) : undefined;
      currentLease = { ...lease, lessee };
    }

    return {
      ...aircraft,
      owner,
      currentLease
    };
  }

  async getAllAircraftWithDetails(): Promise<AircraftWithDetails[]> {
    const aircraftList = Array.from(this.aircraft.values());
    return Promise.all(aircraftList.map(aircraft => this.getAircraftWithDetails(aircraft.id)));
  }

  // Owner Methods
  async getOwner(id: number): Promise<Owner | undefined> {
    return this.owners.get(id);
  }

  async getAllOwners(): Promise<Owner[]> {
    return Array.from(this.owners.values());
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const id = this.currentIds.owner++;
    const newOwner: Owner = { ...owner, id };
    this.owners.set(id, newOwner);
    return newOwner;
  }

  async updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const existingOwner = this.owners.get(id);
    if (!existingOwner) return undefined;

    const updatedOwner = { ...existingOwner, ...owner };
    this.owners.set(id, updatedOwner);
    return updatedOwner;
  }

  async deleteOwner(id: number): Promise<boolean> {
    return this.owners.delete(id);
  }

  // Lessee Methods
  async getLessee(id: number): Promise<Lessee | undefined> {
    return this.lessees.get(id);
  }

  async getAllLessees(): Promise<Lessee[]> {
    return Array.from(this.lessees.values());
  }

  async createLessee(lessee: InsertLessee): Promise<Lessee> {
    const id = this.currentIds.lessee++;
    const newLessee: Lessee = { ...lessee, id };
    this.lessees.set(id, newLessee);
    return newLessee;
  }

  async updateLessee(id: number, lessee: Partial<InsertLessee>): Promise<Lessee | undefined> {
    const existingLessee = this.lessees.get(id);
    if (!existingLessee) return undefined;

    const updatedLessee = { ...existingLessee, ...lessee };
    this.lessees.set(id, updatedLessee);
    return updatedLessee;
  }

  async deleteLessee(id: number): Promise<boolean> {
    return this.lessees.delete(id);
  }

  // Lease Methods
  async getLease(id: number): Promise<Lease | undefined> {
    return this.leases.get(id);
  }

  async getAllLeases(): Promise<Lease[]> {
    return Array.from(this.leases.values());
  }

  async createLease(lease: InsertLease): Promise<Lease> {
    const id = this.currentIds.lease++;
    const createdAt = new Date();
    const newLease: Lease = { ...lease, id, createdAt };
    this.leases.set(id, newLease);
    
    // Update aircraft status to Leased
    const aircraft = this.aircraft.get(lease.aircraftId);
    if (aircraft) {
      this.updateAircraft(aircraft.id, { status: "Leased" });
    }
    
    return newLease;
  }

  async updateLease(id: number, lease: Partial<InsertLease>): Promise<Lease | undefined> {
    const existingLease = this.leases.get(id);
    if (!existingLease) return undefined;

    const updatedLease = { ...existingLease, ...lease };
    this.leases.set(id, updatedLease);
    return updatedLease;
  }

  async deleteLease(id: number): Promise<boolean> {
    const lease = this.leases.get(id);
    if (lease) {
      // If lease is active, update aircraft status back to Available
      if (lease.status === "Active") {
        const aircraft = this.aircraft.get(lease.aircraftId);
        if (aircraft) {
          this.updateAircraft(aircraft.id, { status: "Available" });
        }
      }
    }
    return this.leases.delete(id);
  }

  async getLeaseWithDetails(id: number): Promise<LeaseWithDetails | undefined> {
    const lease = this.leases.get(id);
    if (!lease) return undefined;

    const aircraft = lease.aircraftId ? this.aircraft.get(lease.aircraftId) : undefined;
    const lessee = lease.lesseeId ? this.lessees.get(lease.lesseeId) : undefined;
    const payments = Array.from(this.payments.values())
      .filter(payment => payment.leaseId === id);

    return {
      ...lease,
      aircraft,
      lessee,
      payments
    };
  }

  async getAllLeasesWithDetails(): Promise<LeaseWithDetails[]> {
    const leasesList = Array.from(this.leases.values());
    return Promise.all(leasesList.map(lease => this.getLeaseWithDetails(lease.id)));
  }

  async getLeasesForAircraft(aircraftId: number): Promise<Lease[]> {
    return Array.from(this.leases.values())
      .filter(lease => lease.aircraftId === aircraftId);
  }

  async getLeasesForLessee(lesseeId: number): Promise<Lease[]> {
    return Array.from(this.leases.values())
      .filter(lease => lease.lesseeId === lesseeId);
  }

  // Payment Methods
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentIds.payment++;
    const newPayment: Payment = { ...payment, id };
    this.payments.set(id, newPayment);
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) return undefined;

    const updatedPayment = { ...existingPayment, ...payment };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  async deletePayment(id: number): Promise<boolean> {
    return this.payments.delete(id);
  }

  async getPaymentsForLease(leaseId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.leaseId === leaseId);
  }

  // Maintenance Methods
  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    return this.maintenance.get(id);
  }

  async getAllMaintenance(): Promise<Maintenance[]> {
    return Array.from(this.maintenance.values());
  }

  async createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance> {
    const id = this.currentIds.maintenance++;
    const newMaintenance: Maintenance = { ...maintenance, id };
    this.maintenance.set(id, newMaintenance);
    
    // If it's current maintenance, update aircraft status
    const today = new Date();
    const scheduledDate = new Date(maintenance.scheduledDate);
    if (!maintenance.completedDate && 
        (scheduledDate.getTime() <= today.getTime() && 
         scheduledDate.getTime() >= today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      const aircraft = this.aircraft.get(maintenance.aircraftId);
      if (aircraft) {
        this.updateAircraft(aircraft.id, { status: "Maintenance" });
      }
    }
    
    return newMaintenance;
  }

  async updateMaintenance(id: number, maintenance: Partial<InsertMaintenance>): Promise<Maintenance | undefined> {
    const existingMaintenance = this.maintenance.get(id);
    if (!existingMaintenance) return undefined;

    const updatedMaintenance = { ...existingMaintenance, ...maintenance };
    this.maintenance.set(id, updatedMaintenance);
    
    // If maintenance completed, update aircraft status if needed
    if (maintenance.completedDate && existingMaintenance.status !== "Completed") {
      const aircraft = this.aircraft.get(existingMaintenance.aircraftId);
      if (aircraft && aircraft.status === "Maintenance") {
        // Check if this has an active lease
        const leases = Array.from(this.leases.values())
          .filter(lease => lease.aircraftId === aircraft.id && lease.status === "Active");
        
        const newStatus = leases.length > 0 ? "Leased" : "Available";
        this.updateAircraft(aircraft.id, { status: newStatus });
      }
    }
    
    return updatedMaintenance;
  }

  async deleteMaintenance(id: number): Promise<boolean> {
    return this.maintenance.delete(id);
  }

  async getMaintenanceForAircraft(aircraftId: number): Promise<Maintenance[]> {
    return Array.from(this.maintenance.values())
      .filter(maintenance => maintenance.aircraftId === aircraftId);
  }

  async getUpcomingMaintenance(): Promise<MaintenanceWithDetails[]> {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);
    
    const upcomingMaintenance = Array.from(this.maintenance.values())
      .filter(maintenance => {
        const scheduledDate = new Date(maintenance.scheduledDate);
        return !maintenance.completedDate && 
               scheduledDate >= today && 
               scheduledDate <= nextMonth;
      })
      .sort((a, b) => {
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      });
    
    return Promise.all(upcomingMaintenance.map(maintenance => {
      const aircraft = this.aircraft.get(maintenance.aircraftId);
      return { ...maintenance, aircraft };
    }));
  }

  // Document Methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.currentIds.document++;
    const uploadDate = new Date();
    const newDocument: Document = { ...document, id, uploadDate };
    this.documents.set(id, newDocument);
    return newDocument;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const existingDocument = this.documents.get(id);
    if (!existingDocument) return undefined;

    const updatedDocument = { ...existingDocument, ...document };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  async getDocumentsForEntity(relatedType: string, relatedId: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(document => document.relatedType === relatedType && document.relatedId === relatedId);
  }

  // Dashboard Methods
  async getDashboardStats(): Promise<DashboardStats> {
    const totalAircraft = this.aircraft.size;
    
    const activeLeases = Array.from(this.leases.values())
      .filter(lease => lease.status === "Active").length;
    
    // Calculate monthly revenue from active leases
    const monthlyRevenue = Array.from(this.leases.values())
      .filter(lease => lease.status === "Active")
      .reduce((sum, lease) => sum + lease.monthlyRate, 0);
    
    // Management fee is 10%
    const managementFees = monthlyRevenue * 0.1;
    
    // Payment status counts
    const allPayments = Array.from(this.payments.values());
    const paid = allPayments.filter(payment => payment.status === "Paid").length;
    const pending = allPayments.filter(payment => payment.status === "Pending").length;
    const overdue = allPayments.filter(payment => payment.status === "Overdue").length;
    
    // Calculate revenue by month for the last 6 months
    const revenueByMonth = this.getRevenueByMonth();
    
    return {
      totalAircraft,
      activeLeases,
      monthlyRevenue,
      managementFees,
      paymentStatus: {
        paid,
        pending,
        overdue
      },
      revenueByMonth
    };
  }

  private getRevenueByMonth(): Array<{ month: string; revenue: number; managementFee: number }> {
    const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Generate sample data for the chart
    const revenueData = months.map((month, index) => {
      // Generate some reasonable revenue numbers that increase slightly over time
      const baseRevenue = 35000 + Math.floor(Math.random() * 5000);
      const growthFactor = 1 + (index * 0.05);
      const revenue = Math.round(baseRevenue * growthFactor);
      const managementFee = Math.round(revenue * 0.1);
      
      return {
        month,
        revenue,
        managementFee
      };
    });
    
    return revenueData;
  }
}

export const storage = new MemStorage();
