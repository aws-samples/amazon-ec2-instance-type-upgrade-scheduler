# EC2InstanceTypeUpgradeScheduler

## Introduction
According to the best practices of AWS, when a new EC2 instance type is launched, it is recommended to upgrade to the latest available one. 
There are two reasons: 
firstly, the performance of the new type's computing, storage, and network transmission has improved; 
secondly, the cost of using instances per unit time has been reduced. It is not difficult to upgrade a small number of instances. 
However, when the number of instances is large and the instance relationship is complicated, to plan a feasible and low-cost instance upgrade with manual operation would be significantly time-consuming and difficult. 
This project focuses on how to effectively deal with large-scale instance model upgrades. 
The effectiveness of model upgrades are three-fold. 
1. cost optimization: On the basis of the cost reduction of the new model, we fully consider the limitation of the reserved instance period to maximize the benefits of the reserved instance; 
2. take into account the instance relationship: comprehensively take into account the complex associations and dependencies between the instances, such as master-slave database pair, load balancer group, etc., to minimize the impact of instance upgrades on the overall operation of the system, and make it a smooth transition; 
3. take care of reality constraints: the actual production process has different priorities, and there are various restrictions during the upgrade process, such as workdays vs. holidays, daily processing or downtime limit of instances, etc. 

The above points virtually increase the difficulty and complexity of the model upgrade of the planning example, making manual planning time-consuming and laborious. 
This project uses a lightweight structured query language and AWS's serverless solution to achieve a new and universal model upgrade architecture for planning examples to achieve two goals. 
The first is to significantly reduce the manual planning operations that require several hours to a few seconds; 
the second is to plan and upgrade according to the reserved instance period and other constraints to reduce costs as much as possible.

### AWS Blog
An article was published in AWS Blog to introduce the solution in detail.
- https://aws.amazon.com/cn/blogs/china/plan-ec2-instance-type-upgrade-efficiently-and-economically/

## Deployment
CDK is used as the infrastructure as code solution.
A script file named `deploy.sh` is provided to facilitate resource provisioning process.
To deploy the AWS resources, export the following three environmental properties and run the script.

```bash
export AWS_ACCOUNT=
export REGION=cn-north-1
export PROFILE=

cd cdk
./bash/deploy.sh
```

## Prepare Input Data

Prepare a folder named `data` and put the input data inside, including:
- `instances.csv`: contains instances, with the attribute: id, mode, type, application, reserveExpiryDate;
- `load-balancing.csv`: contains load balancing group information.
- `database-replicas.csv`: contains database replicas information.

After deployment, there will be a common bucket to store input data. To get the common bucket name:
```bash
aws ssm get-parameter --name /scheduler/bucket --profile clementy-bcs-cn | jq -r .Parameter.Value --profile $PROFILE
```

To list the remote data:
```bash
aws s3 ls s3://$(aws ssm get-parameter --name /scheduler/bucket --profile $PROFILE | jq -r .Parameter.Value) --profile $PROFILE
```

To sync the data directory:
```bash
aws s3 sync data s3://$(aws ssm get-parameter --name /scheduler/bucket --profile $PROFILE | jq -r .Parameter.Value) --profile $PROFILE
```

## Schedule Instance Type Upgrade

The input parameters can be defined as a json structure, where:
- `sortBy` is an enum value, takes "app" or "type".
- Allowed days ranges from 0 to 6 with 0 for Sunday.

```json
{
  "startDate": "2021-03-01",
  "sortBy": "app/type",
  
   "devAllowedDays": [1, 2, 3, 4, 5],
  "prodAllowedDays": [0],
  
  "holidays": [
    "2021-04-03",
    "2021-04-04",
    "2021-04-05"
  ],
  
   "devDailyLimit": 10,
  "prodDailyLimit": 50
}
```

After computing, the result table will be printed in the console in CSV format.
You may further store it into a DynamoDB table, or inside a S3 bucket.
