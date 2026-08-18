class Package:
    def __init__(self, name, id, monthly_price, three_monthly_price, six_monthly_price, yearly_price):
        self.name = name
        self.id = id
        self.price = {
            "monthly": monthly_price,
            "3-monthly": three_monthly_price,
            "6-monthly": six_monthly_price,
            "yearly": yearly_price
        }

    def get_price(self, duration):
        return self.price[duration]
    def set_price(self, duration, new_price):
        self.price[duration] = new_price
    def get_name(self):
        return self.name
    def set_name(self, new_name):
        self.name = new_name    
    def get_id(self):
        return self.id      
    def set_id(self, new_id):
        self.id = new_id

class Member:  
    def __init__(self, id, name, email, phone):
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone

    def get_name(self):
        return self.name
    def set_name(self, new_name):
        self.name = new_name    
    def get_email(self):
        return self.email
    def set_email(self, new_email):
        self.email = new_email    
    def get_phone(self):
        return self.phone
    def set_phone(self, new_phone):
        self.phone = new_phone    
    def get_id(self):
        return self.id      
    def set_id(self, new_id):
        self.id = new_id



class Subscription:
    def __init__(self,id,member_id,package_id,start_date,end_date):
        self.id = id
        self.member_id= member_id
        self.package_id=package_id
        self.start_date=start_date
        self.end_date=end_date  

    def get_member_id(self):
        return self.member_id
    def set_member_id(self, new_member_id):    
        self.member_id = new_member_id
    def get_package_id(self):
        return self.package_id
    def set_package_id(self, new_package_id):
        self.package_id = new_package_id
    def get_start_date(self):
        return self.start_date
    def set_start_date(self, new_start_date):
        self.start_date = new_start_date
    def get_end_date(self):
        return self.end_date
    def set_end_date(self, new_end_date):
        self.end_date = new_end_date


indiviual_package = Package("Individual", 1, 3000, 7000, 90000, 16000)
couple_package = Package("Couple", 2, 5000, 12000, 18000, 24000)
members=[]

def register_member(name, email, phone):
    id = len(members) + 1
    member = Member(id, name, email, phone)
    members.append(member)
    return member

subscriptions=[]
def subscribe_member(member_id, package_id, start_date, end_date):
    id = len(subscriptions) + 1
    subscription = Subscription(id, member_id, package_id, start_date, end_date)
    subscriptions.append(subscription)
    return subscription

def display_member_subscriptions(subscriptions):
    for subscription in subscriptions:
        for member in members:
            if subscription.member_id==member.id:
                print(f"Member Name: {member.name}, Email: {member.email}, Phone: {member.phone}")
                print(f"Subscription ID: {subscription.id}, Package ID: {subscription.package_id}, Start Date: {subscription.start_date}, End Date: {subscription.end_date}")
                print("--------------------------------------------------")

def display_package_details(package):
    print(f"Package Name: {package.get_name()}")
    print(f"Package ID: {package.get_id()}")
    print(f"Monthly Price: {package.get_price('monthly')}")
    print(f"3-Monthly Price: {package.get_price('3-monthly')}")
    print(f"6-Monthly Price: {package.get_price('6-monthly')}")
    print(f"Yearly Price: {package.get_price('yearly')}")
    print("--------------------------------------------------")

